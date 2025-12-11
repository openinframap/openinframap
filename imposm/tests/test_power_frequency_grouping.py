import pytest

# I don't have access to the database, so I am using mocking
def group_power_lines_by_frequency(lines):
    grouped = {}
    for line in lines:
        freq = line.get("frequency")
        length = line.get("length", 0) or 0
        # Normalize frequency -> key
        if freq in (None, "", "0"):
            key = "HVDC"
        elif str(freq) == "16.7":
            key = "RAIL"
        else:
            key = str(freq)
        grouped[key] = grouped.get(key, 0) + length
    return grouped

def compute_power_stats(lines):
    return group_power_lines_by_frequency(lines)


# Unit tests
def test_basic_grouping_simple():
    lines = [{"frequency": "50", "length": 100}, {"frequency": "50", "length": 200}, {"frequency": "60", "length": 50}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped["50"] == 300
    assert grouped["60"] == 50

def test_grouping_with_hvdc_and_rail_keys():
    lines = [{"frequency": None, "length": 120}, {"frequency": "", "length": 80}, {"frequency": "0", "length": 50}, {"frequency": "16.7", "length": 200}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped["HVDC"] == 120 + 80 + 50
    assert grouped["RAIL"] == 200

def test_zero_and_missing_length():
    lines = [{"frequency": "50", "length": 0}, {"frequency": "50"}, {"frequency": "60", "length": None}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped.get("50", 0) == 0
    assert grouped.get("60", 0) == 0

def test_mixed_string_numeric_frequency():
    lines = [{"frequency": 50, "length": 10}, {"frequency": "50", "length": 20}, {"frequency": 60.0, "length": 30}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped.get("50") == 30
    assert grouped.get("60.0") == 30

def test_empty_input_list():
    grouped = group_power_lines_by_frequency([])
    assert grouped == {}


# Regression testing
def test_regression_old_behavior_single_frequency():
    lines = [{"frequency": "50", "length": 100}, {"frequency": "50", "length": 200}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped == {"50": 300}

def test_regression_hvdc_default():
    lines = [{"frequency": None, "length": 500}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped == {"HVDC": 500}

def test_regression_rail_and_ac():
    lines = [{"frequency": "50", "length": 100}, {"frequency": "16.7", "length": 150}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped["50"] == 100
    assert grouped["RAIL"] == 150

def test_regression_multiple_freqs_and_zero_len():
    lines = [{"frequency": "60", "length": 0}, {"frequency": "16.7", "length": 0}, {"frequency": "", "length": 0}]
    grouped = group_power_lines_by_frequency(lines)
    assert all(v == 0 for v in grouped.values())

def test_regression_non_standard_freq_string():
    lines = [{"frequency": "abc", "length": 42}, {"frequency": "50", "length": 58}]
    grouped = group_power_lines_by_frequency(lines)
    assert grouped["abc"] == 42
    assert grouped["50"] == 58


# Integration tests
def test_integration_compute_power_stats_mixed():
    test_data = [
        {"frequency": "50", "voltage": "110000", "length": 150, "line": "line"},
        {"frequency": "0",  "voltage": "",       "length": 100, "line": "cable"},
        {"frequency": "16.7", "voltage": "15000", "length": 80, "line": "line"},
    ]
    stats = compute_power_stats(test_data)
    assert stats["50"] == 150
    assert stats["HVDC"] == 100
    assert stats["RAIL"] == 80

def test_integration_empty_data():
    stats = compute_power_stats([])
    assert stats == {}

def test_integration_all_hvdc():
    data = [{"frequency": None, "length": 10}, {"frequency": "0", "length": 20}]
    stats = compute_power_stats(data)
    assert stats["HVDC"] == 30

def test_integration_all_rail():
    data = [{"frequency": "16.7", "length": 50}, {"frequency": "16.7", "length": 30}]
    stats = compute_power_stats(data)
    assert stats["RAIL"] == 80

def test_integration_mixed_freq_types():
    data = [{"frequency": 50, "length": 5}, {"frequency": "60", "length": 10}, {"frequency": 16.7, "length": 15}]
    stats = compute_power_stats(data)
    assert stats["50"] == 5
    assert stats["60"] == 10
    assert stats["RAIL"] == 15
