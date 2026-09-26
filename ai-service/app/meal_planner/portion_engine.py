"""
Deterministic Portion Calculation Engine for AyurDiet Phase 5.
Calculates clinically reasonable, discrete gram/ml servings matching meal targets
within food-specific minimum and maximum portion boundaries.
"""

from typing import Dict, List, Optional
from .models import (
    FoodItem,
    FoodSelectionResult,
    NutritionProfile,
    SourceProvenance,
)


def scale_nutrition(food: FoodItem, quantity: float) -> NutritionProfile:
    """
    Computes scaled nutritional values for a specific portion quantity.
    Grounded strictly in the 100g IFCT reference basis.
    """
    factor = quantity / 100.0
    return NutritionProfile(
        basis=f"{quantity:.0f}{food.serving.unit}",
        calories=round(food.nutrition.calories * factor, 1),
        protein_g=round(food.nutrition.protein_g * factor, 1),
        carbohydrate_g=round(food.nutrition.carbohydrate_g * factor, 1),
        fat_g=round(food.nutrition.fat_g * factor, 1),
        fiber_g=round(food.nutrition.fiber_g * factor, 1),
    )


class PortionEngine:
    """
    Solves discrete, practical food portions for a meal to hit target calories and macros.
    """

    def calculate_meal_portions(
        self,
        candidate_items: List[Dict[str, any]],
        target_calories: float,
        meal_type: str,
    ) -> List[FoodSelectionResult]:
        """
        Determines portion quantities for candidate items in a meal.
        candidate_items is a list of dicts:
          {
            "food": FoodItem,
            "score": float,
            "selection_reason": str,
            "ayurvedic_alignment": str,
            "requires_review": bool,
            "review_notes": Optional[str]
          }
        """
        if not candidate_items:
            return []

        # 1. Initialize each food with its default serving, snapped to step size
        current_quantities: Dict[str, float] = {}
        is_scalable: Dict[str, bool] = {}

        for item in candidate_items:
            f: FoodItem = item["food"]
            # Spices and concentrated fats have fixed small therapeutic portions
            if f.category in ["spice_herb", "oil_fat"] or f.serving.max_quantity <= 15.0:
                qty = f.serving.default_quantity
                is_scalable[f.food_id] = False
            else:
                qty = f.serving.default_quantity
                is_scalable[f.food_id] = True

            qty = self._snap_quantity(qty, f.serving.min_quantity, f.serving.max_quantity, f.serving.step_size)
            current_quantities[f.food_id] = qty

        # 2. Iteratively adjust scalable portions towards target_calories
        if target_calories > 0:
            for _ in range(5):
                total_cals = sum(
                    (current_quantities[item["food"].food_id] / 100.0) * item["food"].nutrition.calories
                    for item in candidate_items
                )
                if abs(total_cals - target_calories) <= 15.0 or total_cals == 0:
                    break

                ratio = target_calories / total_cals
                for item in candidate_items:
                    f = item["food"]
                    if not is_scalable[f.food_id]:
                        continue
                    new_q = current_quantities[f.food_id] * ratio
                    current_quantities[f.food_id] = self._snap_quantity(
                        new_q, f.serving.min_quantity, f.serving.max_quantity, f.serving.step_size
                    )

            # Fine tune with step adjustments on main staples
            current_quantities = self._fine_tune_quantities(
                candidate_items, current_quantities, is_scalable, target_calories
            )

        # 3. Build FoodSelectionResult objects
        results: List[FoodSelectionResult] = []
        for item in candidate_items:
            f = item["food"]
            qty = current_quantities[f.food_id]
            scaled_nutri = scale_nutrition(f, qty)

            results.append(
                FoodSelectionResult(
                    food_id=f.food_id,
                    food_name=f.food_name,
                    category=f.category,
                    quantity=qty,
                    unit=f.serving.unit,
                    nutrition=scaled_nutri,
                    selection_reason=item["selection_reason"],
                    ayurvedic_alignment=item["ayurvedic_alignment"],
                    sources=f.sources,
                    requires_dietitian_review=item.get("requires_review", False),
                    review_notes=item.get("review_notes"),
                )
            )

        return results

    def calculate_single_food_portion_for_target(
        self,
        food: FoodItem,
        target_calories: float,
    ) -> float:
        """
        Calculates the discrete portion of a single food item required to yield target_calories.
        """
        if food.nutrition.calories <= 0:
            return food.serving.default_quantity

        raw_qty = (target_calories / food.nutrition.calories) * 100.0
        return self._snap_quantity(
            raw_qty, food.serving.min_quantity, food.serving.max_quantity, food.serving.step_size
        )

    def _snap_quantity(
        self,
        quantity: float,
        min_q: float,
        max_q: float,
        step: float,
    ) -> float:
        """
        Rounds quantity to nearest step size and clamps within [min_q, max_q].
        """
        if step <= 0:
            step = 10.0
        snapped = round(quantity / step) * step
        if snapped < min_q:
            snapped = min_q
        elif snapped > max_q:
            snapped = max_q
        return round(snapped, 1)

    def _fine_tune_quantities(
        self,
        candidate_items: List[Dict[str, any]],
        quantities: Dict[str, float],
        is_scalable: Dict[str, bool],
        target_calories: float,
    ) -> Dict[str, float]:
        """
        Nudges scalable items by single steps to minimize calorie variance.
        """
        total_cals = sum(
            (quantities[item["food"].food_id] / 100.0) * item["food"].nutrition.calories
            for item in candidate_items
        )
        diff = target_calories - total_cals

        # Pick primary scalable item (e.g. cereal_grain or pulse_legume)
        primary_item = None
        for item in candidate_items:
            f = item["food"]
            if is_scalable.get(f.food_id, False) and f.category in ["cereal_grain", "pulse_legume"]:
                primary_item = f
                break

        if not primary_item:
            # Fallback to any scalable item
            for item in candidate_items:
                f = item["food"]
                if is_scalable.get(f.food_id, False):
                    primary_item = f
                    break

        if primary_item:
            cal_per_step = (primary_item.serving.step_size / 100.0) * primary_item.nutrition.calories
            if cal_per_step > 0:
                steps_needed = round(diff / cal_per_step)
                if steps_needed != 0:
                    cand_q = quantities[primary_item.food_id] + (steps_needed * primary_item.serving.step_size)
                    quantities[primary_item.food_id] = self._snap_quantity(
                        cand_q,
                        primary_item.serving.min_quantity,
                        primary_item.serving.max_quantity,
                        primary_item.serving.step_size,
                    )

        return quantities
