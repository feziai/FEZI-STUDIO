"""FEZI curriculum offline Python example. No external IO or private data."""
from dataclasses import dataclass, asdict
from math import isfinite
import json

@dataclass(frozen=True)
class Task:
    task_id: str
    title: str
    hours: float
    done: bool = False


def make_task(value: dict) -> Task:
    if not isinstance(value, dict):
        raise TypeError('task must be an object')
    task_id = value.get('task_id')
    title = value.get('title')
    hours = value.get('hours')
    done = value.get('done', False)
    if not isinstance(task_id, str) or not task_id.strip() or len(task_id) > 64:
        raise ValueError('task_id must be 1–64 characters')
    if not isinstance(title, str) or not title.strip() or len(title) > 120:
        raise ValueError('title must be 1–120 characters')
    if isinstance(hours, bool) or not isinstance(hours, (int, float)) or not isfinite(hours) or not 0 <= hours <= 1000:
        raise ValueError('hours must be a finite number between 0 and 1000')
    if type(done) is not bool:
        raise ValueError('done must be boolean')
    return Task(task_id.strip(), title.strip(), float(hours), done)


def summarize(items: list[Task]) -> dict:
    if not isinstance(items, list) or not all(isinstance(t, Task) for t in items):
        raise TypeError('items must be list[Task]')
    return {'count': len(items), 'complete': sum(t.done for t in items), 'hours': round(sum(t.hours for t in items), 2)}


def to_json(task: Task) -> str:
    if not isinstance(task, Task):
        raise TypeError('Task required')
    return json.dumps(asdict(task), ensure_ascii=False, sort_keys=True)


def from_json(text: str) -> Task:
    return make_task(json.loads(text))
