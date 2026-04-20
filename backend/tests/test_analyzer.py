import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from analyzer import analyze

SIMPLE = """
def add(a, b):
    return a + b
"""

COMPLEX = """
def classify(n):
    if n < 0:
        if n < -100:
            return "very negative"
        return "negative"
    elif n == 0:
        return "zero"
    else:
        for i in range(n):
            if i % 2 == 0:
                continue
        return "positive"
"""

FLAT_SCRIPT = """
x = 1
y = 2
z = x + y
print(z)
"""

COMMENTED = """
# This is a comment
def greet(name):
    # Another comment
    return f"Hello, {name}"
# End comment
"""

NESTED = """
def deep(data):
    for item in data:
        if item:
            while True:
                if item > 0:
                    break
"""


def test_simple_function():
    metrics, functions = analyze(SIMPLE)
    assert metrics.function_count == 1
    assert len(functions) == 1
    assert functions[0].name == "add"
    assert functions[0].complexity == 1


def test_complex_function_has_higher_complexity():
    metrics, functions = analyze(COMPLEX)
    assert metrics.function_count == 1
    assert metrics.cyclomatic_complexity > 3
    assert metrics.max_nesting_depth >= 2


def test_flat_script_no_functions():
    metrics, functions = analyze(FLAT_SCRIPT)
    assert metrics.function_count == 0
    assert len(functions) == 0
    assert metrics.cyclomatic_complexity == 1
    assert metrics.max_nesting_depth == 0


def test_comment_ratio():
    metrics, _ = analyze(COMMENTED)
    assert metrics.comment_lines >= 3
    assert metrics.comment_ratio > 0


def test_identifiers_collected():
    metrics, _ = analyze(SIMPLE)
    assert "a" in metrics.identifiers or "b" in metrics.identifiers


def test_loc_counted():
    metrics, _ = analyze(SIMPLE)
    assert metrics.loc > 0


def test_nesting_depth_increases_with_nesting():
    flat_metrics, _ = analyze(SIMPLE)
    deep_metrics, _ = analyze(NESTED)
    assert deep_metrics.max_nesting_depth > flat_metrics.max_nesting_depth


def test_depth_sequence_populated_for_branchy_function():
    _, functions = analyze(COMPLEX)
    assert len(functions) == 1
    assert len(functions[0].depth_sequence) > 0


def test_syntax_error_raises():
    import pytest
    with pytest.raises(SyntaxError):
        analyze("def broken(:")


def test_multiple_functions():
    source = """
def foo():
    pass

def bar():
    if True:
        pass
"""
    metrics, functions = analyze(source)
    assert metrics.function_count == 2
    assert len(functions) == 2
    names = {f.name for f in functions}
    assert names == {"foo", "bar"}
