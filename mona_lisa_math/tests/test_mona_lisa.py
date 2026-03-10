"""
Test-Driven Design: Mona Lisa via Mathematical Formulae
========================================================

We reverse-engineer the Mona Lisa into a layered set of mathematical
primitives, then verify each layer independently before composing the
full portrait.

The decomposition follows the classical art-analysis structure:
  1. Canvas & coordinate system
  2. Background landscape (horizon, sfumato atmospheric curves)
  3. Figure silhouette (torso trapezoid, shoulder Béziers)
  4. Face oval & golden-ratio proportions
  5. Facial features (eyes, nose, mouth — the enigmatic smile)
  6. Hands composition
  7. Color palette via parametric color functions
  8. Full composite rendering to a pixel grid
"""

from __future__ import annotations

import math
import pytest
import numpy as np

from mona_lisa_math.formulae import (
    Canvas,
    golden_ratio_partition,
    horizon_curve,
    sfumato_atmosphere,
    face_ellipse,
    left_eye_curve,
    right_eye_curve,
    nose_ridge,
    mona_lisa_smile,
    torso_silhouette,
    left_hand_curve,
    right_hand_curve,
    hair_cascade,
    skin_tone,
    sky_gradient,
    landscape_palette,
    render_mona_lisa,
)


# ─── 1. Canvas & Coordinate System ─────────────────────────────────────

class TestCanvas:
    """The painting is 77 cm × 53 cm (≈ 1.453 aspect ratio).
    We normalise to a unit coordinate system [0,1] × [0, aspect]."""

    def test_canonical_dimensions(self):
        c = Canvas()
        assert c.width_cm == 53
        assert c.height_cm == 77

    def test_aspect_ratio(self):
        c = Canvas()
        assert abs(c.aspect_ratio - 77 / 53) < 1e-6

    def test_normalised_bounds(self):
        c = Canvas()
        assert c.x_range == (0.0, 1.0)
        assert c.y_range == (0.0, pytest.approx(77 / 53, abs=1e-6))

    def test_to_pixel_coords(self):
        c = Canvas(resolution=100)
        px, py = c.to_pixel(0.5, 0.5)
        assert px == 50
        assert py == 50

    def test_from_pixel_coords_roundtrip(self):
        c = Canvas(resolution=200)
        x, y = 0.3, 0.7
        px, py = c.to_pixel(x, y)
        x2, y2 = c.from_pixel(px, py)
        assert abs(x2 - x) < 0.01
        assert abs(y2 - y) < 0.01


# ─── 2. Golden Ratio Layout ────────────────────────────────────────────

class TestGoldenRatioPartition:
    """Leonardo used the golden ratio φ ≈ 1.618 extensively.
    The face, hands, and horizon all sit on φ-derived grid lines."""

    PHI = (1 + math.sqrt(5)) / 2

    def test_phi_value(self):
        partitions = golden_ratio_partition(n_divisions=2)
        assert abs(partitions["phi"] - self.PHI) < 1e-10

    def test_face_centre_on_phi_line(self):
        p = golden_ratio_partition(n_divisions=4)
        # The face centre sits at ≈ 1/φ from the top
        expected_y = 1 - 1 / self.PHI  # ≈ 0.382
        assert abs(p["face_centre_y"] - expected_y) < 0.02

    def test_hands_below_phi_midpoint(self):
        p = golden_ratio_partition(n_divisions=4)
        assert p["hands_centre_y"] > 0.5

    def test_horizon_at_golden_section(self):
        p = golden_ratio_partition(n_divisions=4)
        # Horizon in the background at ≈ 1/φ² from top
        expected = 1 / (self.PHI ** 2)
        assert abs(p["horizon_y"] - expected) < 0.05


# ─── 3. Background Landscape ───────────────────────────────────────────

class TestHorizonCurve:
    """The background has an asymmetric winding landscape.
    Left side sits lower than the right — a deliberate asymmetry."""

    def test_returns_array(self):
        xs = np.linspace(0, 1, 50)
        ys = horizon_curve(xs)
        assert isinstance(ys, np.ndarray)
        assert ys.shape == xs.shape

    def test_left_lower_than_right(self):
        """Da Vinci's landscape: left horizon is lower than right."""
        xs = np.linspace(0, 1, 200)
        ys = horizon_curve(xs)
        left_mean = ys[:50].mean()
        right_mean = ys[150:].mean()
        assert left_mean < right_mean

    def test_smooth_no_discontinuities(self):
        xs = np.linspace(0, 1, 1000)
        ys = horizon_curve(xs)
        diffs = np.abs(np.diff(ys))
        assert diffs.max() < 0.05, "Horizon should be smooth"


class TestSfumatoAtmosphere:
    """Sfumato: Leonardo's signature smoke-like atmospheric haze.
    Modelled as a Gaussian blur kernel whose σ increases with distance."""

    def test_sigma_increases_with_depth(self):
        s_near = sfumato_atmosphere(depth=0.1)
        s_far = sfumato_atmosphere(depth=0.9)
        assert s_far > s_near

    def test_near_objects_are_sharp(self):
        sigma = sfumato_atmosphere(depth=0.0)
        assert sigma < 0.05

    def test_returns_positive(self):
        for d in [0.0, 0.25, 0.5, 0.75, 1.0]:
            assert sfumato_atmosphere(d) >= 0.0


# ─── 4. Face Ellipse ───────────────────────────────────────────────────

class TestFaceEllipse:
    """Mona Lisa's face is a near-perfect oval, slightly narrower at the
    chin.  We model it as a parametric ellipse with a y-dependent radius
    perturbation:  r(θ) = a·(1 - ε·sin(θ)) along the major axis."""

    def test_returns_xy_arrays(self):
        x, y = face_ellipse(n_points=100)
        assert len(x) == 100
        assert len(y) == 100

    def test_vertically_elongated(self):
        x, y = face_ellipse(n_points=360)
        width = x.max() - x.min()
        height = y.max() - y.min()
        assert height > width, "Face should be taller than wide"

    def test_chin_narrower_than_forehead(self):
        x, y = face_ellipse(n_points=360)
        mid_y = (y.max() + y.min()) / 2
        upper_mask = y < mid_y  # forehead region (y increases downward)
        lower_mask = y > mid_y  # chin region
        upper_width = x[upper_mask].max() - x[upper_mask].min()
        lower_width = x[lower_mask].max() - x[lower_mask].min()
        assert lower_width < upper_width

    def test_centred_on_golden_ratio(self):
        x, y = face_ellipse(n_points=360)
        cx = (x.max() + x.min()) / 2
        cy = (y.max() + y.min()) / 2
        # Face should be roughly centred horizontally, slightly left of centre
        assert 0.4 < cx < 0.6
        phi = (1 + math.sqrt(5)) / 2
        expected_cy = 1 - 1 / phi
        assert abs(cy - expected_cy) < 0.1


# ─── 5. Facial Features ────────────────────────────────────────────────

class TestEyes:
    """Eyes are modelled as quartic Bézier curves (upper lid) with a
    circular iris inset.  Left eye is very slightly larger due to the
    three-quarter pose."""

    def test_left_eye_produces_curve(self):
        t = np.linspace(0, 1, 50)
        x, y = left_eye_curve(t)
        assert x.shape == (50,)
        assert y.shape == (50,)

    def test_right_eye_produces_curve(self):
        t = np.linspace(0, 1, 50)
        x, y = right_eye_curve(t)
        assert x.shape == (50,)

    def test_eyes_horizontally_separated(self):
        t = np.linspace(0, 1, 50)
        lx, _ = left_eye_curve(t)
        rx, _ = right_eye_curve(t)
        assert lx.mean() < rx.mean()

    def test_eyes_at_same_height(self):
        t = np.linspace(0, 1, 50)
        _, ly = left_eye_curve(t)
        _, ry = right_eye_curve(t)
        assert abs(ly.mean() - ry.mean()) < 0.03

    def test_left_eye_slightly_larger(self):
        """Three-quarter pose: nearer eye spans wider."""
        t = np.linspace(0, 1, 100)
        lx, _ = left_eye_curve(t)
        rx, _ = right_eye_curve(t)
        left_span = lx.max() - lx.min()
        right_span = rx.max() - rx.min()
        assert left_span > right_span


class TestNose:
    def test_nose_ridge_is_vertical(self):
        t = np.linspace(0, 1, 50)
        x, y = nose_ridge(t)
        x_range = x.max() - x.min()
        y_range = y.max() - y.min()
        assert y_range > x_range * 2, "Nose ridge should be mostly vertical"

    def test_nose_between_eyes_and_mouth(self):
        t = np.linspace(0, 1, 50)
        _, ny = nose_ridge(t)
        _, ey = left_eye_curve(t)
        sx, sy = mona_lisa_smile(t)
        assert ny.min() >= ey.min() - 0.02
        assert ny.max() <= sy.max() + 0.02


class TestSmile:
    """The *enigmatic smile* is the centrepiece.  Mathematically it is a
    cubic curve with a subtle upward inflection at the corners, combined
    with a Gaussian micro-curvature that shifts depending on viewing
    angle — hence the ambiguity."""

    def test_smile_produces_curve(self):
        t = np.linspace(0, 1, 100)
        x, y = mona_lisa_smile(t)
        assert x.shape == (100,)

    def test_corners_higher_than_centre(self):
        """The subtle upturn at the corners of the mouth."""
        t = np.linspace(0, 1, 200)
        x, y = mona_lisa_smile(t)
        centre_y = y[90:110].mean()
        left_corner_y = y[:20].mean()
        right_corner_y = y[180:].mean()
        # Corners curve upward (lower y if y-axis points down, or
        # higher y if y increases upward) — we define y-up
        assert left_corner_y > centre_y or right_corner_y > centre_y

    def test_smile_is_subtle(self):
        """Amplitude of the smile curvature is small relative to width."""
        t = np.linspace(0, 1, 200)
        x, y = mona_lisa_smile(t)
        amplitude = y.max() - y.min()
        width = x.max() - x.min()
        ratio = amplitude / width
        assert ratio < 0.25, "Smile should be subtle, not a grin"

    def test_slight_asymmetry(self):
        """The left side of the smile is slightly more upturned."""
        t = np.linspace(0, 1, 200)
        x, y = mona_lisa_smile(t)
        mid = len(t) // 2
        left_curvature = y[:mid].mean() - y[mid // 2]
        right_curvature = y[mid:].mean() - y[mid + mid // 2]
        # Asymmetry exists
        assert abs(left_curvature - right_curvature) > 1e-5


# ─── 6. Torso & Hands ──────────────────────────────────────────────────

class TestTorso:
    def test_torso_below_face(self):
        t = np.linspace(0, 1, 100)
        x_t, y_t = torso_silhouette(t)
        _, y_f = face_ellipse(n_points=100)
        assert y_t.mean() > y_f.mean(), "Torso should be below the face"

    def test_torso_wider_than_face(self):
        t = np.linspace(0, 1, 100)
        x_t, _ = torso_silhouette(t)
        x_f, _ = face_ellipse(n_points=100)
        assert (x_t.max() - x_t.min()) > (x_f.max() - x_f.min())


class TestHands:
    def test_hands_in_lower_half(self):
        t = np.linspace(0, 1, 50)
        _, ly = left_hand_curve(t)
        _, ry = right_hand_curve(t)
        assert ly.mean() > 0.5
        assert ry.mean() > 0.5

    def test_hands_are_crossed(self):
        """The right hand rests on the left wrist — their x-ranges overlap."""
        t = np.linspace(0, 1, 50)
        lx, _ = left_hand_curve(t)
        rx, _ = right_hand_curve(t)
        overlap = min(lx.max(), rx.max()) - max(lx.min(), rx.min())
        assert overlap > 0, "Hands should overlap (crossed pose)"


# ─── 7. Hair ───────────────────────────────────────────────────────────

class TestHair:
    def test_hair_frames_face(self):
        t = np.linspace(0, 1, 100)
        hx, hy = hair_cascade(t)
        fx, fy = face_ellipse(n_points=100)
        # Hair should extend wider and higher than the face
        assert hx.min() <= fx.min()
        assert hx.max() >= fx.max()
        assert hy.min() <= fy.min()


# ─── 8. Colour Palette (Parametric) ────────────────────────────────────

class TestColourPalette:
    """Da Vinci's palette: earth tones, muted greens, warm skin tones.
    Each colour function returns (R, G, B) in [0, 1]."""

    def test_skin_tone_warm(self):
        r, g, b = skin_tone(lightness=0.5)
        assert r > g > b, "Skin tone: red > green > blue (warm)"

    def test_skin_tone_range(self):
        for lum in [0.0, 0.25, 0.5, 0.75, 1.0]:
            r, g, b = skin_tone(lum)
            assert all(0 <= c <= 1 for c in (r, g, b))

    def test_sky_gradient_blue_dominant(self):
        r, g, b = sky_gradient(height=0.9)
        assert b >= g and b >= r

    def test_landscape_earthy(self):
        r, g, b = landscape_palette(depth=0.5)
        assert g >= b, "Landscape should be greenish-brown"


# ─── 9. Full Composite Render ──────────────────────────────────────────

class TestFullRender:
    """Integration test: compose every formula layer into a final image."""

    def test_render_returns_image_array(self):
        img = render_mona_lisa(resolution=64)
        assert isinstance(img, np.ndarray)
        assert img.ndim == 3  # H × W × 3 (RGB)

    def test_render_correct_shape(self):
        img = render_mona_lisa(resolution=64)
        h, w, c = img.shape
        assert c == 3
        assert w == 64
        expected_h = int(64 * 77 / 53)
        assert abs(h - expected_h) <= 1

    def test_render_pixel_values_normalised(self):
        img = render_mona_lisa(resolution=32)
        assert img.min() >= 0.0
        assert img.max() <= 1.0

    def test_render_not_uniform(self):
        """The image should have actual content, not a flat colour."""
        img = render_mona_lisa(resolution=64)
        assert img.std() > 0.05

    def test_face_region_is_skin_coloured(self):
        """Sample pixels in the face region — they should be warm-toned."""
        img = render_mona_lisa(resolution=128)
        h, w, _ = img.shape
        # Face region: roughly centre-x, upper-third y
        cy = int(h * 0.3)
        cx = int(w * 0.5)
        r, g, b = img[cy, cx]
        # Skin-like: red channel dominant
        assert r > b, "Face region should have warm (reddish) skin tone"
