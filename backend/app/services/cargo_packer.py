import math
from typing import List, Dict, Any, Optional

class CargoPacker:
    """
    3D Container & Cargo Bin Packing Heuristic Engine:
    - Implements 3D First-Fit Decreasing (FFD) shelf/layer allocation.
    - Evaluates volumetric container utilization (%) and payload weight capacity (%).
    - Generates 3D spatial placement coordinates (x, y, z) for interactive UI rendering.
    - Computes axle load distribution score (balance between front and rear chassis).
    """

    DEFAULT_CONTAINER = {
        "name": "Standard 20-ft Heavy Commercial Container",
        "length_cm": 590.0,
        "width_cm": 235.0,
        "height_cm": 239.0,
        "max_payload_kg": 8500.0
    }

    @classmethod
    def pack_cargo(
        cls,
        boxes: List[Dict[str, Any]],
        container_dims: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Packs cargo packages into a 3D container using First-Fit Decreasing (FFD) spatial layout.
        """
        dims = container_dims or cls.DEFAULT_CONTAINER
        c_len = float(dims.get("length_cm", 590.0))
        c_wid = float(dims.get("width_cm", 235.0))
        c_hgt = float(dims.get("height_cm", 239.0))
        c_max_weight = float(dims.get("max_payload_kg", 8500.0))

        container_volume_m3 = round((c_len * c_wid * c_hgt) / 1_000_000.0, 2)

        # 1. Enrich and sort items by volume descending (FFD heuristic)
        items = []
        for idx, b in enumerate(boxes):
            l = float(b.get("length_cm", 50.0))
            w = float(b.get("width_cm", 40.0))
            h = float(b.get("height_cm", 40.0))
            wt = float(b.get("weight_kg", 25.0))
            vol = (l * w * h) / 1_000_000.0
            items.append({
                "item_id": b.get("item_id") or f"BOX-{idx+1:03d}",
                "label": b.get("label") or f"Consignment Box #{idx+1}",
                "length_cm": l,
                "width_cm": w,
                "height_cm": h,
                "weight_kg": wt,
                "volume_m3": vol,
                "fragile": b.get("fragile", False)
            })

        items.sort(key=lambda x: (x["volume_m3"], x["weight_kg"]), reverse=True)

        packed = []
        unpacked = []
        current_weight = 0.0
        current_packed_volume = 0.0

        # Spatial shelf/layer cursors
        cur_x = 0.0
        cur_y = 0.0
        cur_z = 0.0
        row_max_y = 0.0
        layer_max_z = 0.0

        for item in items:
            l, w, h, wt = item["length_cm"], item["width_cm"], item["height_cm"], item["weight_kg"]

            # Weight limit check
            if current_weight + wt > c_max_weight:
                unpacked.append({
                    **item,
                    "rejection_reason": f"Exceeds max payload capacity ({c_max_weight} kg)"
                })
                continue

            # Oversize single item check
            if l > c_len or w > c_wid or h > c_hgt:
                unpacked.append({
                    **item,
                    "rejection_reason": "Dimensions exceed container interior dimensions"
                })
                continue

            # Shelf placement algorithm
            if cur_x + l > c_len:
                # Move to next row in Y axis
                cur_x = 0.0
                cur_y += row_max_y
                row_max_y = 0.0

            if cur_y + w > c_wid:
                # Move to next layer in Z axis
                cur_x = 0.0
                cur_y = 0.0
                row_max_y = 0.0
                cur_z += layer_max_z
                layer_max_z = 0.0

            if cur_z + h > c_hgt:
                # Container height completely full
                unpacked.append({
                    **item,
                    "rejection_reason": "Container volumetric height exhausted"
                })
                continue

            # Assign spatial position (x, y, z)
            pos_x = round(cur_x, 1)
            pos_y = round(cur_y, 1)
            pos_z = round(cur_z, 1)

            packed.append({
                "item_id": item["item_id"],
                "label": item["label"],
                "length_cm": l,
                "width_cm": w,
                "height_cm": h,
                "weight_kg": wt,
                "volume_m3": round(item["volume_m3"], 3),
                "position_x_cm": pos_x,
                "position_y_cm": pos_y,
                "position_z_cm": pos_z,
                "fragile": item["fragile"]
            })

            current_weight += wt
            current_packed_volume += item["volume_m3"]
            cur_x += l
            row_max_y = max(row_max_y, w)
            layer_max_z = max(layer_max_z, h)

        # 3. Calculate utilization metrics
        vol_utilization_pct = round((current_packed_volume / max(0.01, container_volume_m3)) * 100.0, 1)
        weight_utilization_pct = round((current_weight / max(1.0, c_max_weight)) * 100.0, 1)

        # Axle Load Distribution Score (balance of mass along X axis)
        if packed:
            midpoint = c_len / 2.0
            front_mass = sum(p["weight_kg"] for p in packed if p["position_x_cm"] < midpoint)
            rear_mass = sum(p["weight_kg"] for p in packed if p["position_x_cm"] >= midpoint)
            total_mass = front_mass + rear_mass
            if total_mass > 0:
                diff_ratio = abs(front_mass - rear_mass) / total_mass
                axle_score = max(50.0, round((1.0 - diff_ratio) * 100.0, 1))
            else:
                axle_score = 100.0
        else:
            axle_score = 100.0

        return {
            "status": "PACKING_COMPLETE",
            "container_profile": {
                "name": dims.get("name", "Standard Heavy Truck"),
                "length_cm": c_len,
                "width_cm": c_wid,
                "height_cm": c_hgt,
                "total_volume_m3": container_volume_m3,
                "max_payload_kg": c_max_weight
            },
            "summary": {
                "total_boxes_requested": len(boxes),
                "boxes_packed_count": len(packed),
                "unpacked_boxes_count": len(unpacked),
                "total_packed_weight_kg": round(current_weight, 1),
                "weight_utilization_pct": min(100.0, weight_utilization_pct),
                "total_packed_volume_m3": round(current_packed_volume, 2),
                "volumetric_efficiency_pct": min(100.0, vol_utilization_pct),
                "axle_balance_score": axle_score,
                "is_overweight": current_weight > c_max_weight,
                "packing_density_category": (
                    "Optimal High-Density Load" if vol_utilization_pct > 70
                    else "Standard Commercial Load" if vol_utilization_pct > 40
                    else "Low-Density Volume Available"
                )
            },
            "packed_items": packed,
            "unpacked_items": unpacked
        }
