"""
Analysis: How often does February start on Sunday, end on Saturday, with exactly 28 days?

A "perfect February" fills a calendar grid perfectly — 4 complete weeks,
Sunday to Saturday, no spillover. This requires:
  1. A non-leap year (28 days)
  2. February 1st falls on a Sunday

The Gregorian calendar repeats exactly every 400 years (146,097 days = 20,871 weeks).
So we can count occurrences in any 400-year window to get the exact frequency.
"""

import calendar


def find_perfect_februaries(start_year: int, end_year: int) -> list[int]:
    """Find all years in [start_year, end_year) with a perfect February."""
    results = []
    for year in range(start_year, end_year):
        if calendar.isleap(year):
            continue
        # calendar.weekday: 0=Monday, 6=Sunday
        if calendar.weekday(year, 2, 1) == 6:
            results.append(year)
    return results


def main():
    # Count over one full 400-year Gregorian cycle
    cycle_start, cycle_end = 2001, 2401
    perfect_years = find_perfect_februaries(cycle_start, cycle_end)
    count = len(perfect_years)

    print("=" * 60)
    print("  How often is February a 'perfect' calendar month?")
    print("  (Starts Sunday, ends Saturday, exactly 28 days)")
    print("=" * 60)
    print()
    print(f"In one 400-year Gregorian cycle ({cycle_start}-{cycle_end - 1}):")
    print(f"  Perfect Februaries:  {count}")
    print(f"  Average frequency:   once every {400 / count:.1f} years")
    print(f"  Probability:         {count / 400 * 100:.2f}% (about 1 in {400 // count})")
    print()

    # Show gaps between occurrences
    gaps = [perfect_years[i] - perfect_years[i - 1] for i in range(1, len(perfect_years))]
    unique_gaps = sorted(set(gaps))
    print(f"  Gaps between occurrences: {', '.join(str(g) for g in unique_gaps)} years")
    print(f"  Most common pattern:      6 → 11 → 11 → 6 → 11 → 11 → ...")
    print()

    # Highlight recent/upcoming perfect Februaries
    print("Recent and upcoming perfect Februaries:")
    nearby = find_perfect_februaries(1990, 2110)
    for i, y in enumerate(nearby):
        marker = " ← THIS MONTH!" if y == 2026 else ""
        gap = f"  (+{y - nearby[i-1]} yrs)" if i > 0 else ""
        print(f"  {y}{gap}{marker}")

    print()
    print("Verdict: Not 1 in 800 — it's about 1 in 9.")
    print("And it's happening right now in February 2026!")


if __name__ == "__main__":
    main()
