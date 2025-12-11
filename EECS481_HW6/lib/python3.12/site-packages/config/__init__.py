#
# Copyright 2019-2021 by Vinay Sajip. All Rights Reserved.
#
try:
    from collections.abc import Mapping
except ImportError:
    from collections import Mapping
import datetime
import importlib
import io
import logging
import os
import re
import sys

from .tokens import Token, SCALAR_TOKENS, WORD, BACKTICK, DOLLAR
from .parser import (
    Parser,
    MappingBody,
    ListBody,
    ASTNode,
    ODict,
    open_file,
    RecognizerError,
    ParserError,
)

__all__ = ['Config', 'ConfigFormatError', 'ConfigError']

logger = logging.getLogger(__name__)


if sys.version_info[0] < 3:

    class timezone(datetime.tzinfo):
        def __init__(self, td):
            self.td = td

        def utcoffset(self, dt):
            return self.td

        def dst(self, dt):  # pragma: no cover
            return datetime.timedelta(0)


else:
    from datetime import timezone

    basestring = str

__version__ = '0.5.1'


class ConfigFormatError(ParserError):
    pass


class ConfigError(ValueError):
    pass


# This is a marker used in get(key, default_value) to catch rather than KeyError
class KeyNotFoundError(ConfigError):
    pass


def _parse_path(path):
    p = Parser(io.StringIO(path))
    try:
        p.advance()
        if p.token.kind != WORD:
            raise ConfigError('Invalid path: %s' % path)
        result = p.primary()
        if not p.at_end:
            raise ConfigError('Invalid path: %s' % path)
    except RecognizerError as e:
        raise ConfigError('Invalid path: %s: %s' % (path, e))
    return result


def _path_iterator(path):
    def visit(node):
        if isinstance(node, Token):
            yield node
        else:
            op = node['op']
            if 'operand' in node:
                for val in visit(node['operand']):
                    yield val
            else:
                for val in visit(node['lhs']):
                    yield val
                if op == '.':
                    yield op, node['rhs'].value
                else:
                    assert op in ('[', ':')
                    yield op, node['rhs']

    for v in visit(path):
        yield v


def _to_source(node):
    if isinstance(node, Token):
        return str(node.value)
    pi = _path_iterator(node)
    parts = [next(pi).value]
    for op, operand in pi:
        if op == '.':
            parts.append('.')
            parts.append(operand)
        elif op == ':':
            parts.append('[')
            start, stop, step = operand
            if start is not None:
                parts.append(_to_source(start))
            parts.append(':')
            if stop is not None:
                parts.append(_to_source(stop))
            if step is not None:
                parts.append(':')
                parts.append(_to_source(step))
            parts.append(']')
        elif op == '[':
            parts.append('[')
            parts.append(_to_source(operand))
            parts.append(']')
        else:  # pragma: no cover
            raise ConfigError('Unable to navigate: %s' % node)
    return ''.join(parts)


def _unwrap(o):
    if isinstance(o, DictWrapper):
        result = o.as_dict()
    elif isinstance(o, ListWrapper):
        result = o.as_list()
    else:
        result = o
    return result


def _string_for(o):
    if isinstance(o, list):
        items = []
        for item in o:
            items.append(_string_for(item))
        return '[%s]' % ', '.join(items)
    elif isinstance(o, dict):
        items = []
        for k, v in o.items():
            items.append('%s: %s' % (k, _string_for(v)))
        return '{%s}' % ', '.join(items)
    else:
        result = str(o)
    return result

# noinspection PyUnboundLocalVariable
_SYSTEM_TYPES = (basestring, bool, int, float, datetime.datetime, datetime.date)
# noinspection PyTypeChecker
_SCALAR_TYPES = _SYSTEM_TYPES + (Token,)


def _merge_dicts(target, source):
    for k, v in source.items():
        if k in target and isinstance(target[k], dict) and isinstance(v, Mapping):
            _merge_dicts(target[k], v)
        else:
            target[k] = source[k]


# use negative lookahead to disallow anything starting with a digit.
_IDENTIFIER_PATTERN = re.compile(r'^(?!\d)(\w+)$', re.U)


def is_identifier(s):
    return bool(_IDENTIFIER_PATTERN.match(s))


class DictWrapper(object):
    def __init__(self, config, data):
        self.config = config
        self._data = data

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyNotFoundError:
            return default

    def __getitem__(self, key):
        if not isinstance(key, basestring):
            raise ConfigError('string required, but found %r' % key)
        data = self._data
        config = self.config
        if key in data or is_identifier(key):
            try:
                result = config._evaluated(data[key])
            except KeyError:
                raise KeyNotFoundError('not found in configuration: %s' % key)
        else:
            path = _parse_path(key)
            result = config._get_from_path(path)
        # data[key] = result
        return result

    def __len__(self):  # pragma: no cover
        return len(self._data)

    def __contains__(self, key):
        return key in self._data

    def __or__(self, other):
        assert isinstance(other, type(self))
        data = self.as_dict()
        _merge_dicts(data, other.as_dict())
        return type(self)(self.config, data)

    __add__ = __or__

    def __sub__(self, other):
        assert isinstance(other, type(self))
        data = dict(self._data)
        for k in other._data:
            data.pop(k, None)
        return type(self)(self.config, data)

    def as_dict(self):
        result = {}
        for k, v in self._data.items():
            v = self[k]
            if isinstance(v, (DictWrapper, Config)):
                v = v.as_dict()
            elif isinstance(v, ListWrapper):
                v = v.as_list()
            result[k] = v
        return result

    def __repr__(self):
        s = str(', '.join(self._data.keys()))
        if len(s) > 60:
            s = s[:57] + '...'
        return '%s(%s)' % (self.__class__.__name__, s)


class ListWrapper(object):
    def __init__(self, config, data):
        self.config = config
        self._data = data

    def __len__(self):
        return len(self._data)

    def __getitem__(self, index):
        assert isinstance(index, int)  # slices handled in Evaluator
        result = self._data[index]
        evaluated = self.config._evaluated(result)
        if evaluated is not result:
            self._data[index] = result = evaluated
        return result

    def __add__(self, other):
        assert isinstance(other, type(self))
        return type(self)(self.config, self.as_list() + other.as_list())

    def as_list(self):
        result = []
        for item in self:
            if isinstance(item, (DictWrapper, Config)):
                item = item.as_dict()
            elif isinstance(item, ListWrapper):
                item = item.as_list()
            result.append(item)
        return result

    def __repr__(self):
        s = str(self.as_list())
        if len(s) > 60:
            s = s[:57] + '...'
        return '%s(%s)' % (self.__class__.__name__, s)


_ISO_DATETIME_PATTERN = re.compile(
    r'\d{4}-\d{2}-\d{2}(([ T])'
    r'((?P<time>\d{2}:\d{2}:\d{2})'
    r'(?P<ms>\.\d{1,6})?'
    r'((?P<sign>[+-])(?P<oh>\d{2}):'
    r'(?P<om>\d{2})(:(?P<os>\d{2})'
    r'(?P<oms>\.\d{1,6})?)?)?))?$'
)
_DOTTED_WORDS = r'[A-Za-z_]\w*(\.[A-Za-z_]\w*)*'
_COLON_OBJECT_PATTERN = re.compile('%s:(%s)?$' % (_DOTTED_WORDS, _DOTTED_WORDS))
_DOTTED_OBJECT_PATTERN = re.compile('%s$' % _DOTTED_WORDS)
_ENV_VALUE_PATTERN = re.compile(r'\$(\w+)(\|(.*))?$')
_INTERPOLATION_PATTERN = re.compile(r'\$\{([^}]+)\}')

class Evaluator(object):
    """
    This class is used to evaluate AST nodes. A separate class for this (rather
    than putting the functionality in Config) because an evaluation context is
    sometimes required. For example, resolving references needs to keep track
    of references already seen in an evaluation, to catch circular references.
    That needs to be done per-evaluation.
    """

    op_map = {
        '@': 'eval_at',
        '$': 'eval_reference',
        ':': 'eval_slice',
        '+': 'eval_add',
        '-': 'eval_subtract',
        '*': 'eval_multiply',
        '**': 'eval_power',
        '/': 'eval_divide',
        '//': 'eval_integer_divide',
        '%': 'eval_modulo',
        '<<': 'eval_left_shift',
        '>>': 'eval_right_shift',
        '|': 'eval_bitor',
        '&': 'eval_bitand',
        '^': 'eval_bitxor',
        'or': 'eval_logor',
        'and': 'eval_logand',
    }

    def __init__(self, config):
        self.config = config
        self.refs_seen = {}

    def evaluate(self, node):
        result = node
        if isinstance(node, Token):
            if node.kind in SCALAR_TOKENS:
                result = node.value
            elif node.kind == WORD:
                try:
                    result = self.config.context[node.value]
                except KeyError:
                    msg = 'Unknown variable \'%s\' at %s' % (node.value, node.start)
                    raise ConfigError(msg)
            elif node.kind == BACKTICK:
                result = self.config.convert_string(node.value)
            else:  # pragma: no cover
                raise NotImplementedError('Unable to evaluate %s' % node)
        elif isinstance(node, ASTNode):
            op = node['op']
            meth = self.op_map[op]
            result = getattr(self, meth)(node)
        if isinstance(result, (MappingBody, ListBody)):
            result = self.config._wrap(result)
        return result

    def eval_at(self, node):
        operand = node['operand']
        config = self.config
        fn = config._evaluated(operand)
        if not isinstance(fn, basestring):
            raise ConfigError('@ operand must be a string, but is %s' % fn)
        found = False
        if os.path.isabs(fn):
            if os.path.isfile(fn):
                p = fn
                found = True
        else:
            p = os.path.join(config.rootdir, fn)
            if os.path.isfile(p):
                found = True
            else:
                for ip in config.include_path:
                    p = os.path.join(ip, fn)
                    if os.path.isfile(p):
                        found = True
                        break
        if not found:
            raise ConfigError('Unable to locate %s' % fn)
        with open_file(p) as f:
            rootdir = os.path.dirname(p)
            p = Parser(f)
            result = p.container()
            if isinstance(result, MappingBody):
                cfg = Config(
                    None, context=config.context, cache=config._cache is not None,
                    include_path=config.include_path, rootdir=rootdir
                )
                cfg._parent = config
                cfg._data = cfg._wrap_mapping(result)
                result = cfg
        return result

    def _get_from_path(self, path):
        def is_ref(n):
            return isinstance(n, ASTNode) and n['op'] == DOLLAR

        pi = _path_iterator(path)
        first = next(pi)
        config = self.config
        node = config._data[first.value]
        result = self.evaluate(node)
        # We start the evaluation with the current instance, but a path may
        # cross sub-configuration boundaries, and references must always be
        # evaluated in the context of the immediately enclosing configuration,
        # not the top-level configuration (references are relative to the
        # root of the enclosing configuration - otherwise configurations would
        # not be standalone. So whenever we cross a sub-configuration boundary,
        # the current_evaluator has to be pegged to that sub-configuration.
        current_evaluator = self
        for op, operand in pi:
            need_string = False
            if not isinstance(result, (ListWrapper, DictWrapper, Config)):
                container = result
            else:
                container = result._data
                if isinstance(result, Config):
                    current_evaluator = result._evaluator
                need_string = not isinstance(result, ListWrapper)
            sliced = False
            if isinstance(operand, tuple):
                operand = slice(*[current_evaluator.evaluate(item) for item in operand])
                sliced = True
                if not isinstance(result, ListWrapper):
                    raise ConfigError('slices can only operate on lists')
            elif op != '.':
                operand = current_evaluator.evaluate(operand)
            if need_string:
                if not isinstance(operand, basestring):
                    raise ConfigError('string required, but found %r' % operand)
            elif not isinstance(operand, (int, slice)):
                raise ConfigError(
                    'integer or slice required, but found \'%s\'' % operand
                )
            try:
                v = container[operand]  # always use indexing, never attr
            except IndexError:
                raise ConfigError('index out of range: %s' % operand)
            except KeyError:
                raise KeyNotFoundError('not found in configuration: %s' % operand)
            if is_ref(v):
                vid = id(v)
                if vid in current_evaluator.refs_seen:
                    parts = []
                    for v in current_evaluator.refs_seen.values():
                        parts.append(
                            '%s %s' % (_to_source(v), v['operand']['lhs'].start)
                        )
                    s = ', '.join(sorted(parts))
                    raise ConfigError('Circular reference: %s' % s)
                current_evaluator.refs_seen[vid] = v
            if sliced:
                v = ListBody(v)  # ListBody gets wrapped, but not list
            # v = config._wrap(v)
            evaluated = current_evaluator.evaluate(v)
            if evaluated is not v:
                container[operand] = evaluated
            result = evaluated
        return result

    def eval_reference(self, node):
        result = self._get_from_path(node['operand'])
        return result

    def eval_add(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            result = lhs + rhs
            if isinstance(result, list):
                result = ListWrapper(lhs.config, result)
            return result
        except TypeError:
            raise ConfigError('Unable to add %s to %s' % (rhs, lhs))

    def eval_subtract(self, node):
        if 'operand' in node:
            # unary
            operand = self.evaluate(node['operand'])
            try:
                return -operand
            except TypeError:
                raise ConfigError('Unable to negate %s' % operand)
        else:
            lhs = self.evaluate(node['lhs'])
            rhs = self.evaluate(node['rhs'])
            try:
                return lhs - rhs
            except TypeError:
                raise ConfigError('Unable to subtract %s from %s' % (rhs, lhs))

    def eval_multiply(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs * rhs
        except TypeError:
            raise ConfigError('Unable to multiply %s by %s' % (lhs, rhs))

    def eval_divide(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs / rhs
        except TypeError:
            raise ConfigError('Unable to divide %s by %s' % (lhs, rhs))

    def eval_integer_divide(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs // rhs
        except TypeError:
            raise ConfigError('Unable to integer-divide %s by %s' % (lhs, rhs))

    def eval_modulo(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs % rhs
        except TypeError:
            raise ConfigError('Unable to compute %s modulo %s' % (lhs, rhs))

    def eval_power(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs ** rhs
        except TypeError:
            raise ConfigError('Unable to divide %s by %s' % (lhs, rhs))

    def eval_left_shift(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs << rhs
        except TypeError:
            raise ConfigError('Unable to left-shift %s by %s' % (lhs, rhs))

    def eval_right_shift(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs >> rhs
        except TypeError:
            raise ConfigError('Unable to right-shift %s by %s' % (lhs, rhs))

    def eval_bitor(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs | rhs
        except TypeError:
            raise ConfigError('Unable to bitwise-or %s and %s' % (lhs, rhs))

    def eval_bitand(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs & rhs
        except TypeError:
            raise ConfigError('Unable to bitwise-and %s and %s' % (lhs, rhs))

    def eval_bitxor(self, node):
        lhs = self.evaluate(node['lhs'])
        rhs = self.evaluate(node['rhs'])
        try:
            return lhs ^ rhs
        except TypeError:
            raise ConfigError('Unable to bitwise-xor %s and %s' % (lhs, rhs))

    def eval_logor(self, node):
        lhs = self.evaluate(node['lhs'])
        return lhs or self.evaluate(node['rhs'])

    def eval_logand(self, node):
        lhs = self.evaluate(node['lhs'])
        return lhs and self.evaluate(node['rhs'])


def _walk_dotted_path(result, dotted_path):
    if isinstance(dotted_path, basestring):
        parts = dotted_path.split('.')
    else:
        parts = dotted_path
    for p in parts:
        result = getattr(result, p)
    return result


def _resolve_dotted_object(s):
    parts = s.split('.')
    modname = parts.pop(0)
    # first part must be a module/package.
    result = importlib.import_module(modname)
    while parts:
        p = parts[0]
        s = '%s.%s' % (modname, p)
        try:
            result = importlib.import_module(s)
            parts.pop(0)
            modname = s
        except ImportError:
            result = _walk_dotted_path(result, parts)
            break
    return result


def _resolve_colon_object(s):
    module_name, dotted_path = s.split(':')
    if module_name in sys.modules:
        mod = sys.modules[module_name]
    else:
        mod = importlib.import_module(module_name)
    if not dotted_path:
        result = mod
    else:
        result = _walk_dotted_path(mod, dotted_path)
    return result


def _default_convert_string(s, config):
    result = s
    m = _ISO_DATETIME_PATTERN.match(s)
    if m:
        gd = m.groupdict()
        if not gd['time']:
            result = datetime.datetime.strptime(m.string, '%Y-%m-%d').date()
        else:
            s = '%s %s' % (m.string[:10], gd['time'])
            result = datetime.datetime.strptime(s, '%Y-%m-%d %H:%M:%S')
            if gd['ms']:
                ms = int(float(gd['ms']) * 1e6)
                result = result.replace(microsecond=ms)
            if gd['oh']:
                oh = int(gd['oh'], 10)
                om = int(gd['om'], 10)
                osec = oms = 0
                if sys.version_info[:2] >= (3, 7):
                    if gd['os']:
                        osec = int(gd['os'], 10)
                    if gd['oms']:
                        oms = int(float(gd['oms']) * 1e6)
                td = datetime.timedelta(
                    hours=oh, minutes=om, seconds=osec, microseconds=oms
                )
                if gd['sign'] == '-':
                    td = -td
                tzinfo = timezone(td)
                result = result.replace(tzinfo=tzinfo)
    else:
        m = _ENV_VALUE_PATTERN.match(s)
        if m:
            key, _, default = m.groups()
            result = os.environ.get(key, default)
        else:
            m = _COLON_OBJECT_PATTERN.match(s)
            try:
                if m:
                    result = _resolve_colon_object(s)
                else:
                    m = _DOTTED_OBJECT_PATTERN.match(s)
                    if m:
                        result = _resolve_dotted_object(s)
                    else:
                        m = _INTERPOLATION_PATTERN.search(s)
                        if m:
                            parts = []
                            cp = 0
                            failed = False
                            for m in _INTERPOLATION_PATTERN.finditer(s):
                                sp, ep = m.span()
                                if sp > cp:
                                    parts.append(s[cp:sp])
                                path = m.groups()[0]
                                try:
                                    v = config[path]

                                    parts.append(_string_for(v))
                                    cp = ep
                                except Exception as e:
                                    failed = True
                                    break
                            if not failed:
                                if cp < len(s):
                                    parts.append(s[cp:])
                                result = ''.join(parts)
            except ImportError:
                pass
    return result


class Config(object):

    _string_converter = staticmethod(_default_convert_string)

    def __init__(self, stream_or_path, **kwargs):
        self.context = kwargs.get('context', {})
        self.include_path = kwargs.get('include_path', [])
        self.no_duplicates = kwargs.get('no_duplicates', True)
        self.strict_conversions = kwargs.get('strict_conversions', True)
        cache = kwargs.get('cache', False)
        self.path = kwargs.get('path')
        self.rootdir = kwargs.get('rootdir')
        self._can_close = False
        self._parent = self._data = self._stream = None
        self._cache = {} if cache else None
        self._evaluator = Evaluator(self)
        if stream_or_path:
            if isinstance(stream_or_path, basestring):
                self.load_file(stream_or_path, kwargs.get('encoding'))
            else:
                self.load(stream_or_path)

    def _wrap_mapping(self, items):
        data = ODict()
        seen = {}
        result = DictWrapper(self, data)
        for k, v in items:
            key = k.value
            if self.no_duplicates:
                if key in seen:
                    msg = 'Duplicate key %s seen at %s ' '(previously at %s)' % (
                        key,
                        k.start,
                        seen[key],
                    )
                    raise ConfigError(msg)
                seen[key] = k.start
            data[key] = v
        return result

    def _get_from_path(self, path):
        # convenience method
        evaluator = self._evaluator
        evaluator.refs_seen.clear()
        return evaluator._get_from_path(path)

    def convert_string(self, s):
        result = self._string_converter(s, self)
        if result is s and self.strict_conversions:
            raise ConfigError('Unable to convert string \'%s\'' % s)
        return result

    def _wrap(self, o):
        if isinstance(o, MappingBody):
            result = self._wrap_mapping(o)
        elif isinstance(o, ListBody):
            result = ListWrapper(self, o)
        else:
            result = o
        return result

    def _evaluated(self, v):
        return self._evaluator.evaluate(v)

    def _get(self, key, default=None):
        cached = self._cache is not None
        if cached and key in self._cache:
            result = self._cache[key]
        else:
            result = self._data.get(key, default)
            if cached:
                self._cache[key] = result
        return result

    def get(self, key, default=None):
        return _unwrap(self._get(key, default))

    def __getitem__(self, key):
        cached = self._cache is not None
        if cached and key in self._cache:
            result = self._cache[key]
        else:
            result = self._data[key]
            if cached:
                self._cache[key] = result
        return _unwrap(result)

    def __contains__(self, key):
        return key in self._data

    def as_dict(self):
        return self._data.as_dict()

    # for compatibility with old code base (and its tests)

    def __len__(self):
        result = 0
        if self._data is not None:
            result = len(self._data)
        return result

    def load(self, stream):
        self._stream = stream
        path = self.path
        if path is None:
            path = getattr(stream, 'name', None)
            if path is None:
                rootdir = os.getcwd()
            else:
                rootdir = os.path.dirname(os.path.abspath(path))
            self.rootdir = rootdir
            self.path = path
        try:
            p = Parser(stream)
            items = p.container()
        except ParserError as pe:
            cfe = ConfigFormatError(*pe.args)
            cfe.location = pe.location
            raise cfe
        if not isinstance(items, MappingBody):
            raise ConfigError('Root configuration must be a mapping')
        self._data = self._wrap_mapping(items)
        if self._cache is not None:
            self._cache.clear()

    def load_file(self, path, encoding=None):
        with io.open(path, encoding=encoding or 'utf-8') as f:
            self.load(f)

    def close(self):
        if self._can_close and self._stream:
            self._stream.close()

    def __getattr__(self, key):
        import warnings

        msg = 'Attribute access is deprecated (%s); use indexed access instead.' % key
        warnings.warn(msg, DeprecationWarning, stacklevel=2)
        return self._data[key]
