export const EXAMPLES = [
  {
    label: 'Fibonacci',
    description: 'Recursive branching — ascending arpeggio with harmonic overlays on each self-call',
    code: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)`,
  },
  {
    label: 'Quicksort',
    description: 'Divide & conquer — fast tempo with deep nested voices and pivot accents',
    code: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left  = [x for x in arr if x < pivot]
    mid   = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + mid + quicksort(right)`,
  },
  {
    label: 'Binary Search',
    description: 'Iterative halving — steady loop rhythm with branching melodic shifts',
    code: `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
  },
  {
    label: 'Merge Sort',
    description: 'Two-function recursion — two independent voices that interleave rhythmically',
    code: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid   = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result`,
  },
  {
    label: 'Stack Class',
    description: 'OOP with five methods — five distinct voices at different pitch registers',
    code: `class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if self.is_empty():
            return None
        return self.items.pop()

    def peek(self):
        if self.is_empty():
            return None
        return self.items[-1]

    def is_empty(self):
        return len(self.items) == 0

    def size(self):
        return len(self.items)`,
  },
  {
    label: 'Prime Sieve',
    description: 'Nested loops over a sieve — layered repeated phrases with exponential amplitude decay',
    code: `def primes(limit):
    sieve = [True] * (limit + 1)
    sieve[0] = sieve[1] = False
    for i in range(2, int(limit ** 0.5) + 1):
        if sieve[i]:
            for j in range(i * i, limit + 1, i):
                sieve[j] = False
    for num in range(2, limit + 1):
        if sieve[num]:
            yield num

def first_n_primes(n):
    result = []
    for p in primes(500):
        result.append(p)
        if len(result) == n:
            break
    return result`,
  },
];
