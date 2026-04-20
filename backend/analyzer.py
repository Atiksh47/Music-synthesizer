import ast
import tokenize
import io
import hashlib
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class FunctionData:
    name: str
    complexity: int
    max_depth: int
    loc: int
    depth_sequence: List[int]


@dataclass
class CodeMetrics:
    loc: int = 0
    comment_lines: int = 0
    cyclomatic_complexity: int = 1
    max_nesting_depth: int = 0
    function_count: int = 0
    class_count: int = 0
    identifiers: List[str] = field(default_factory=list)

    @property
    def comment_ratio(self) -> float:
        return self.comment_lines / max(self.loc, 1)

    @property
    def avg_identifier_length(self) -> float:
        return (
            sum(len(i) for i in self.identifiers) / len(self.identifiers)
            if self.identifiers
            else 4.0
        )

    @property
    def identifier_hash(self) -> int:
        combined = "".join(sorted(set(self.identifiers)))
        return int(hashlib.md5(combined.encode()).hexdigest(), 16)


_NESTING = (
    ast.If, ast.For, ast.AsyncFor, ast.While,
    ast.With, ast.AsyncWith, ast.Try, ast.ExceptHandler,
)
_BRANCHES = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler)


def _walk_global(node: ast.AST, metrics: CodeMetrics, depth: int = 0) -> int:
    """Recursively walk the full AST, updating metrics. Returns max depth reached."""
    if isinstance(node, _BRANCHES):
        metrics.cyclomatic_complexity += 1
    if isinstance(node, ast.BoolOp):
        metrics.cyclomatic_complexity += len(node.values) - 1
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        metrics.function_count += 1
    if isinstance(node, ast.ClassDef):
        metrics.class_count += 1
    if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
        metrics.identifiers.append(node.id)
    if isinstance(node, ast.arg):
        metrics.identifiers.append(node.arg)

    is_nesting = isinstance(node, _NESTING)
    child_depth = depth + 1 if is_nesting else depth

    max_seen = child_depth
    for child in ast.iter_child_nodes(node):
        max_seen = max(max_seen, _walk_global(child, metrics, child_depth))

    return max_seen


def _walk_function(node: ast.AST, depth: int = 0) -> Tuple[int, int, List[int]]:
    """Walk a function subtree. Returns (extra_complexity, max_depth, depth_sequence)."""
    complexity = 0
    max_depth = depth
    depth_sequence: List[int] = []

    if isinstance(node, _BRANCHES):
        complexity += 1
    if isinstance(node, ast.BoolOp):
        complexity += len(node.values) - 1

    is_nesting = isinstance(node, _NESTING)
    if is_nesting:
        depth += 1
        max_depth = depth
        depth_sequence.append(depth)

    for child in ast.iter_child_nodes(node):
        c, d, seq = _walk_function(child, depth)
        complexity += c
        max_depth = max(max_depth, d)
        depth_sequence.extend(seq)

    return complexity, max_depth, depth_sequence


def _count_lines(source: str) -> Tuple[int, int]:
    loc = sum(1 for line in source.splitlines() if line.strip())
    comments = 0
    try:
        for tok_type, *_ in tokenize.generate_tokens(io.StringIO(source).readline):
            if tok_type == tokenize.COMMENT:
                comments += 1
    except tokenize.TokenError:
        pass
    return loc, comments


def analyze(source: str) -> Tuple[CodeMetrics, List[FunctionData], ast.AST]:
    tree = ast.parse(source)
    metrics = CodeMetrics()

    max_depth = _walk_global(tree, metrics)
    metrics.max_nesting_depth = max_depth

    functions: List[FunctionData] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            complexity, max_d, depth_seq = _walk_function(node)
            loc = (
                node.end_lineno - node.lineno + 1
                if hasattr(node, "end_lineno")
                else 1
            )
            functions.append(FunctionData(
                name=node.name,
                complexity=max(complexity, 1),
                max_depth=max_d,
                loc=loc,
                depth_sequence=depth_seq,
            ))

    loc, comments = _count_lines(source)
    metrics.loc = loc
    metrics.comment_lines = comments

    return metrics, functions, tree
