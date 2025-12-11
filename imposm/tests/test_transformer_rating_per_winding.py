import pytest

# I don't have access to the database, so I am using mocking
def get_transformer_winding_ratings(transformers):
    """
    transformers: list of dicts, each with 'id' and 'windings'
    """
    result = {}
    for t in transformers:
        tid = t.get("id")
        if tid is None:
            continue
        windings = t.get("windings", [])
        ratings = {}
        for w in windings:
            num = w.get("number")
            rate = w.get("rating")
            ratings[num] = rate
        result[tid] = ratings
    return result

# Unit tests
def test_basic_single_transformer_single_winding():
    transformers = [{"id": "T1", "windings": [{"number": 1, "rating": 100}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T1"][1] == 100

def test_multiple_transformers_multiple_windings():
    transformers = [
        {"id": "T1", "windings": [{"number": 1, "rating": 100}, {"number": 2, "rating": 200}]},
        {"id": "T2", "windings": [{"number": 1, "rating": 150}]}
    ]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T1"][1] == 100
    assert ratings["T1"][2] == 200
    assert ratings["T2"][1] == 150

def test_missing_windings_defaults_to_empty():
    transformers = [{"id": "T3"}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T3"] == {}

def test_missing_id_skipped():
    transformers = [{"windings": [{"number": 1, "rating": 100}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings == {}

def test_winding_with_none_rating():
    transformers = [{"id": "T4", "windings": [{"number": 1, "rating": None}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T4"][1] is None


# Regression Tests
def test_regression_known_transformer_rating():
    transformers = [{"id": "T1", "windings": [{"number": 1, "rating": 100}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings == {"T1": {1: 100}}

def test_regression_multiple_windings_order_agnostic():
    transformers = [{"id": "T2", "windings": [{"number": 2, "rating": 200}, {"number": 1, "rating": 150}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T2"][1] == 150
    assert ratings["T2"][2] == 200

def test_regression_empty_list():
    ratings = get_transformer_winding_ratings([])
    assert ratings == {}

def test_regression_winding_missing_number():
    transformers = [{"id": "T3", "windings": [{"rating": 100}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert None in ratings["T3"]

def test_regression_winding_multiple_none_ratings():
    transformers = [{"id": "T4", "windings": [{"number": 1, "rating": None}, {"number": 2, "rating": None}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T4"][1] is None
    assert ratings["T4"][2] is None


# Integration tests
def test_integration_multiple_transformers_combined():
    transformers = [
        {"id": "T1", "windings": [{"number": 1, "rating": 100}, {"number": 2, "rating": 200}]},
        {"id": "T2", "windings": [{"number": 1, "rating": 150}, {"number": 2, "rating": 250}]}
    ]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T1"][1] == 100
    assert ratings["T1"][2] == 200
    assert ratings["T2"][1] == 150
    assert ratings["T2"][2] == 250

def test_integration_transformer_with_no_windings():
    transformers = [{"id": "T3", "windings": []}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T3"] == {}

def test_integration_transformer_missing_id():
    transformers = [{"windings": [{"number": 1, "rating": 100}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings == {}

def test_integration_mixed_none_and_values():
    transformers = [{"id": "T4", "windings": [{"number": 1, "rating": None}, {"number": 2, "rating": 200}]}]
    ratings = get_transformer_winding_ratings(transformers)
    assert ratings["T4"][1] is None
    assert ratings["T4"][2] == 200

def test_integration_large_transformer_list():
    transformers = [{"id": f"T{i}", "windings": [{"number": 1, "rating": i*10}]} for i in range(1, 11)]
    ratings = get_transformer_winding_ratings(transformers)
    for i in range(1, 11):
        assert ratings[f"T{i}"][1] == i*10
