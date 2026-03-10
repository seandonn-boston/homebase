"""
Mona Lisa — Purely Mathematical Formulae
==========================================

Every visual element of the Mona Lisa is decomposed into closed-form
mathematical expressions: ellipses, Bézier curves, Gaussians, and
parametric colour functions.  No image data or lookup tables are used.

Coordinate system
-----------------
  x ∈ [0, 1]    (left → right)
  y ∈ [0, H/W]  (top → bottom, normalised by width)

Constants
---------
  WIDTH_CM  = 53
  HEIGHT_CM = 77
  φ (phi)   = (1 + √5) / 2 ≈ 1.61803
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, Tuple

import numpy as np

# ── Constants ───────────────────────────────────────────────────────────

PHI = (1 + math.sqrt(5)) / 2
WIDTH_CM = 53
HEIGHT_CM = 77
ASPECT = HEIGHT_CM / WIDTH_CM  # ≈ 1.4528


# ── 1. Canvas ──────────────────────────────────────────────────────────

@dataclass
class Canvas:
    """Normalised coordinate system for the painting."""

    width_cm: int = WIDTH_CM
    height_cm: int = HEIGHT_CM
    resolution: int = 256

    @property
    def aspect_ratio(self) -> float:
        return self.height_cm / self.width_cm

    @property
    def x_range(self) -> Tuple[float, float]:
        return (0.0, 1.0)

    @property
    def y_range(self) -> Tuple[float, float]:
        return (0.0, self.aspect_ratio)

    def to_pixel(self, x: float, y: float) -> Tuple[int, int]:
        px = int(round(x * self.resolution))
        py = int(round(y * self.resolution))
        return px, py

    def from_pixel(self, px: int, py: int) -> Tuple[float, float]:
        return px / self.resolution, py / self.resolution


# ── 2. Golden Ratio Partition ──────────────────────────────────────────

def golden_ratio_partition(n_divisions: int = 4) -> Dict[str, float]:
    """Return key compositional anchors derived from φ."""
    return {
        "phi": PHI,
        "face_centre_y": 1 - 1 / PHI,          # ≈ 0.382
        "hands_centre_y": 0.68,                  # below midpoint
        "horizon_y": 1 / (PHI ** 2),            # ≈ 0.382
    }


# ── 3. Background Landscape ───────────────────────────────────────────

def horizon_curve(xs: np.ndarray) -> np.ndarray:
    """Asymmetric winding horizon — left side lower than right.

    h(x) = 0.38 + 0.04·sin(2πx) + 0.03·x + 0.02·sin(4πx − 1)
    """
    return (
        0.35
        + 0.02 * np.sin(2 * np.pi * xs)
        + 0.10 * xs
        + 0.015 * np.sin(4 * np.pi * xs - 1.0)
    )


def sfumato_atmosphere(depth: float) -> float:
    """Leonardo's sfumato: Gaussian blur σ that grows with depth.

    σ(d) = 0.01 + 0.15 · d²
    """
    return 0.01 + 0.15 * depth * depth


# ── 4. Face Ellipse ───────────────────────────────────────────────────

def face_ellipse(n_points: int = 360) -> Tuple[np.ndarray, np.ndarray]:
    """Parametric oval — narrower at chin via sin-modulated radius.

    x(θ) = cx + a·(1 − ε·sin(θ))·cos(θ)
    y(θ) = cy + b·sin(θ)

    where ε = 0.15 produces chin tapering.
    """
    cx, cy = 0.48, 1 - 1 / PHI  # ≈ (0.48, 0.382)
    a = 0.10   # semi-width
    b = 0.14   # semi-height
    epsilon = 0.15

    theta = np.linspace(0, 2 * np.pi, n_points, endpoint=False)
    r_mod = 1 - epsilon * np.sin(theta)
    x = cx + a * r_mod * np.cos(theta)
    y = cy + b * np.sin(theta)
    return x, y


# ── 5. Facial Features ────────────────────────────────────────────────

def _bezier_cubic(t: np.ndarray, p0, p1, p2, p3) -> Tuple[np.ndarray, np.ndarray]:
    """Evaluate a cubic Bézier curve at parameter values t ∈ [0,1]."""
    u = 1 - t
    x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
    y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
    return x, y


def left_eye_curve(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Left eye (viewer's left, nearer in three-quarter pose → wider).

    Cubic Bézier upper lid + mirrored lower lid.
    """
    return _bezier_cubic(
        t,
        (0.41, 0.34),
        (0.43, 0.32),
        (0.46, 0.32),
        (0.48, 0.34),
    )


def right_eye_curve(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Right eye — slightly narrower due to three-quarter turn."""
    return _bezier_cubic(
        t,
        (0.50, 0.34),
        (0.515, 0.325),
        (0.535, 0.325),
        (0.55, 0.34),
    )


def nose_ridge(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Nose as a near-vertical cubic Bézier with gentle S-curve.

    Runs from bridge (between eyes) to tip (above mouth).
    """
    return _bezier_cubic(
        t,
        (0.48, 0.34),
        (0.475, 0.38),
        (0.480, 0.41),
        (0.478, 0.44),
    )


def mona_lisa_smile(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """The enigmatic smile — a cubic with asymmetric corner upturn.

    The left corner is lifted slightly more than the right, producing
    the famous ambiguity.

    Base curve:  y(x) = y₀ + α·(x − cx)² + β·(x − cx)³
    where α controls the gentle curvature and β the asymmetry.
    """
    x = 0.43 + 0.10 * t  # mouth spans x ∈ [0.43, 0.53]

    cx = 0.48   # centre of mouth
    y0 = 0.47   # vertical position
    alpha = 0.8   # upward curvature at corners (parabolic)
    beta = 1.5    # asymmetry (cubic term — lifts left more)

    dx = x - cx
    y = y0 + alpha * dx**2 + beta * dx**3

    return x, y


# ── 6. Torso & Hands ──────────────────────────────────────────────────

def torso_silhouette(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Torso as a wide Bézier trapezoid below the face."""
    return _bezier_cubic(
        t,
        (0.30, 0.55),
        (0.25, 0.75),
        (0.70, 0.75),
        (0.65, 0.55),
    )


def left_hand_curve(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Left hand resting on arm-rest, lower half of painting."""
    return _bezier_cubic(
        t,
        (0.38, 0.68),
        (0.36, 0.72),
        (0.42, 0.74),
        (0.46, 0.70),
    )


def right_hand_curve(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Right hand crossing over left wrist."""
    return _bezier_cubic(
        t,
        (0.42, 0.66),
        (0.44, 0.71),
        (0.50, 0.73),
        (0.52, 0.68),
    )


# ── 7. Hair ────────────────────────────────────────────────────────────

def hair_cascade(t: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Hair framing the face — a wide parabolic cascade.

    x(t) = cx + w·cos(π·t)
    y(t) = y_top + h·t²
    """
    cx = 0.48
    w = 0.16   # wider than face (face a=0.10)
    y_top = 0.22  # above face top
    h = 0.35

    x = cx + w * np.cos(np.pi * t)
    y = y_top + h * t ** 2
    return x, y


# ── 8. Colour Palette ─────────────────────────────────────────────────

def skin_tone(lightness: float) -> Tuple[float, float, float]:
    """Parametric skin colour: warm earth tone.

    R(l) = 0.45 + 0.45·l
    G(l) = 0.30 + 0.35·l
    B(l) = 0.18 + 0.25·l
    """
    r = min(1.0, 0.45 + 0.45 * lightness)
    g = min(1.0, 0.30 + 0.35 * lightness)
    b = min(1.0, 0.18 + 0.25 * lightness)
    return (r, g, b)


def sky_gradient(height: float) -> Tuple[float, float, float]:
    """Sky colour — desaturated blue-grey, Da Vinci palette.

    Higher = more blue.
    """
    r = 0.55 - 0.20 * height
    g = 0.55 - 0.10 * height
    b = 0.55 + 0.15 * height
    return (
        max(0.0, min(1.0, r)),
        max(0.0, min(1.0, g)),
        max(0.0, min(1.0, b)),
    )


def landscape_palette(depth: float) -> Tuple[float, float, float]:
    """Earthy landscape greens/browns.

    G > B always; depth controls darkness.
    """
    r = 0.30 + 0.15 * (1 - depth)
    g = 0.35 + 0.15 * (1 - depth)
    b = 0.15 + 0.10 * (1 - depth)
    return (
        max(0.0, min(1.0, r)),
        max(0.0, min(1.0, g)),
        max(0.0, min(1.0, b)),
    )


# ── 9. Full Composite Renderer ────────────────────────────────────────

def _point_in_ellipse(px, py, cx, cy, a, b) -> bool:
    return ((px - cx) / a) ** 2 + ((py - cy) / b) ** 2 <= 1.0


def render_mona_lisa(resolution: int = 256) -> np.ndarray:
    """Compose all formula layers into an RGB image array.

    Returns ndarray of shape (H, W, 3) with values in [0, 1].
    """
    w = resolution
    h = int(round(resolution * ASPECT))
    img = np.zeros((h, w, 3), dtype=np.float64)

    # Pre-compute normalised coordinate grids
    xs = np.linspace(0, 1, w)
    ys = np.linspace(0, ASPECT, h)

    # --- Layer 1: Sky gradient background ---
    for j, y_norm in enumerate(ys):
        rel_height = 1.0 - y_norm / ASPECT  # 1 at top, 0 at bottom
        r, g, b = sky_gradient(rel_height)
        img[j, :, 0] = r
        img[j, :, 1] = g
        img[j, :, 2] = b

    # --- Layer 2: Landscape below horizon ---
    h_curve = horizon_curve(xs)
    for i, x_val in enumerate(xs):
        horizon_y = h_curve[i] * ASPECT
        for j, y_val in enumerate(ys):
            if y_val > horizon_y and y_val < 0.65 * ASPECT:
                depth = (y_val - horizon_y) / (0.65 * ASPECT - horizon_y + 1e-9)
                r, g, b = landscape_palette(depth)
                sigma = sfumato_atmosphere(1.0 - depth)
                blend = max(0.3, 1.0 - sigma)
                img[j, i] = [r * blend, g * blend, b * blend]

    # --- Layer 3: Torso ---
    t_param = np.linspace(0, 1, 300)
    tx, ty = torso_silhouette(t_param)
    torso_cx = tx.mean()
    torso_top = ty.min()
    torso_bot = ty.max()
    torso_half_w = (tx.max() - tx.min()) / 2
    for j, y_val in enumerate(ys):
        y_norm_val = y_val / ASPECT
        for i, x_val in enumerate(xs):
            if torso_top <= y_norm_val <= torso_bot:
                frac = (y_norm_val - torso_top) / (torso_bot - torso_top + 1e-9)
                local_hw = torso_half_w * (0.6 + 0.4 * frac)
                if abs(x_val - torso_cx) < local_hw:
                    r, g, b = 0.22, 0.18, 0.12  # dark dress
                    img[j, i] = [r, g, b]

    # --- Layer 4: Hair ---
    ht, hy_arr = hair_cascade(np.linspace(0, 1, 400))
    for idx in range(len(ht)):
        px = int(np.clip(ht[idx] * w, 0, w - 1))
        py = int(np.clip(hy_arr[idx] / ASPECT * h * ASPECT / ASPECT, 0, h - 1))
        py = int(np.clip(hy_arr[idx] * h / ASPECT, 0, h - 1))
        if 0 <= px < w and 0 <= py < h:
            img[py, px] = [0.12, 0.08, 0.04]  # dark brown hair

    # --- Layer 5: Face ---
    face_cx, face_cy = 0.48, 1 - 1 / PHI
    face_a, face_b = 0.10, 0.14
    for j, y_val in enumerate(ys):
        y_norm_val = y_val / ASPECT
        for i, x_val in enumerate(xs):
            if _point_in_ellipse(x_val, y_norm_val, face_cx, face_cy, face_a, face_b):
                dist = math.sqrt(
                    ((x_val - face_cx) / face_a) ** 2
                    + ((y_norm_val - face_cy) / face_b) ** 2
                )
                lightness = 0.6 - 0.2 * dist
                r, g, b = skin_tone(lightness)
                img[j, i] = [r, g, b]

    # --- Layer 6: Eyes, nose, smile as dark strokes ---
    t_fine = np.linspace(0, 1, 200)
    for curve_fn in [left_eye_curve, right_eye_curve, nose_ridge, mona_lisa_smile]:
        cx_arr, cy_arr = curve_fn(t_fine)
        for idx in range(len(cx_arr)):
            px = int(np.clip(cx_arr[idx] * w, 0, w - 1))
            py = int(np.clip(cy_arr[idx] * h / ASPECT, 0, h - 1))
            if 0 <= px < w and 0 <= py < h:
                img[py, px] = [0.18, 0.12, 0.08]

    # --- Layer 7: Hands ---
    for hand_fn in [left_hand_curve, right_hand_curve]:
        hx, hy = hand_fn(t_fine)
        for idx in range(len(hx)):
            px = int(np.clip(hx[idx] * w, 0, w - 1))
            py = int(np.clip(hy[idx] * h / ASPECT, 0, h - 1))
            if 0 <= px < w and 0 <= py < h:
                r, g, b = skin_tone(0.45)
                img[py, px] = [r, g, b]

    return np.clip(img, 0.0, 1.0)
