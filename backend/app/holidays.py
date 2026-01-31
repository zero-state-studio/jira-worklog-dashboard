"""Holiday calculation utilities."""
from datetime import date, timedelta


def calculate_easter(year: int) -> date:
    """
    Calculate Easter Sunday using the Anonymous Gregorian algorithm
    (Meeus/Jones/Butcher).
    """
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def calculate_easter_monday(year: int) -> date:
    """Calculate Easter Monday (Pasquetta) for a given year."""
    return calculate_easter(year) + timedelta(days=1)


# Italian fixed national holidays: (name, month, day)
ITALY_FIXED_HOLIDAYS = [
    ("Capodanno", 1, 1),
    ("Epifania", 1, 6),
    ("Festa della Liberazione", 4, 25),
    ("Festa del Lavoro", 5, 1),
    ("Festa della Repubblica", 6, 2),
    ("Ferragosto", 8, 15),
    ("Tutti i Santi", 11, 1),
    ("Immacolata Concezione", 12, 8),
    ("Natale", 12, 25),
    ("Santo Stefano", 12, 26),
]


def generate_holidays_for_year(year: int, country: str = "IT") -> list[dict]:
    """
    Generate the default holiday list for a given year and country.
    Returns list of dicts ready for DB insertion.
    """
    holidays = []

    if country == "IT":
        # Fixed national holidays
        for name, month, day in ITALY_FIXED_HOLIDAYS:
            holidays.append({
                "name": name,
                "holiday_date": date(year, month, day).isoformat(),
                "holiday_type": "fixed",
                "month": month,
                "day": day,
                "country": country,
                "is_active": 1,
            })

        # Variable: Easter Monday
        easter_monday = calculate_easter_monday(year)
        holidays.append({
            "name": "Lunedi' dell'Angelo (Pasquetta)",
            "holiday_date": easter_monday.isoformat(),
            "holiday_type": "variable",
            "month": None,
            "day": None,
            "country": country,
            "is_active": 1,
        })

    return holidays
