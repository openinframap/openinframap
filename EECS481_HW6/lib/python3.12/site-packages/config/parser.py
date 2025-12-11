# -*- coding: utf-8 -*-
#
# Copyright 2018-2020 by Vinay Sajip. All Rights Reserved.
#

from collections import OrderedDict
import functools
import io
import logging
import sys

from .tokens import *

logger = logging.getLogger(__name__)

open_file = functools.partial(io.open, encoding='utf-8')


class ParserError(RecognizerError):
    pass


class ODict(OrderedDict):
    """
    This class preserves insertion order for display purposes but is
    otherwise just a dict.
    """

    def __repr__(self):  # pragma: no cover
        result = []
        for k, v in self.items():
            result.append('%r: %r' % (k, v))
        return '{%s}' % ', '.join(result)


class ASTNode(ODict):
    start = end = None


class MappingBody(list):
    start = end = None


class ListBody(list):
    start = end = None


def set_positions(node, start, end):
    node.start = start
    node.end = end


def make_unary_expr(op, operand):
    """
    This function makes an AST node for a unary expression
    """
    result = ASTNode()
    # The str() calls are to avoid repr ugliness in 2.x
    result[str('op')] = str(op)
    result[str('operand')] = operand
    return result


def make_binary_expr(op, lhs, rhs):
    """
    This function makes an AST node for a binary expression
    """
    result = ASTNode()
    # The str() calls are to avoid repr ugliness in 2.x
    result[str('op')] = str(op)
    result[str('lhs')] = lhs
    result[str('rhs')] = rhs
    return result


def invalid_index(n, pos):
    raise ParserError(
        'Invalid index at %s: expected 1 expression, ' 'found %d' % (pos, n)
    )


TOKEN_REPRS = {
    WORD: 'identifier',
    NEWLINE: 'newline',
    INTEGER: 'integer',
    FLOAT: 'floating-point value',
    COMPLEX: 'complex value',
    STRING: 'string',
    BACKTICK: 'backtick-string',
    EOF: 'EOF',
}


def token_repr(kind):
    if kind in TOKEN_REPRS:
        return TOKEN_REPRS[kind]
    if sys.version_info[0] == 2:
        return "'%s'" % kind
    return '%r' % kind


VALUE_STARTERS = {WORD, INTEGER, FLOAT, COMPLEX, STRING, BACKTICK, TRUE, FALSE, NONE}


class Parser(object):
    def __init__(self, stream=None):
        self.stream = stream
        if stream:
            self.tokenizer = Tokenizer(stream)
        else:
            self.tokenizer = None
        self.token = None

    def _make_stream(self, text):
        if not isinstance(text, text_type):
            text = text.decode('utf-8')
        self.stream = io.StringIO(text)
        self.tokenizer = Tokenizer(self.stream)
        self.token = None

    @property
    def at_end(self):
        return self.token.kind == EOF

    @property
    def remaining(self):  # for debugging
        return self.tokenizer.remaining

    def advance(self):
        self.token = self.tokenizer.get_token()
        return self.token.kind

    def expect(self, tt):
        if self.token.kind != tt:
            pe = ParserError(
                'Expected %s, got %s at %s' % (token_repr(tt), token_repr(self.token.kind), self.token.start)
            )
            pe.location = self.token.start
            raise pe
        result = self.token
        self.advance()
        return result

    def consume_newlines(self):
        tt = self.token.kind
        while tt == NEWLINE:
            tt = self.advance()
        return tt

    def object_key(self):
        if self.token.kind == STRING:
            result = self.strings()
        else:
            result = self.token
            self.advance()
        return result

    def mapping_body(self):
        result = MappingBody()
        start = self.token.start
        tt = self.consume_newlines()
        if tt in (RCURLY, EOF):
            end = self.token.end
            set_positions(result, start, end)
            return result
        if tt not in (WORD, STRING):
            pe = ParserError(
                'Unexpected %s at %s' % (token_repr(self.token.kind), self.token.start)
            )
            pe.location = self.token.start
            raise pe
        while tt in (WORD, STRING):
            key = self.object_key()
            if self.token.kind not in (COLON, ASSIGN):
                pe = ParserError(
                    'Unexpected %s at %s'
                    % (token_repr(self.token.kind), self.token.start)
                )
                pe.location = self.token.start
                raise pe
            self.advance()
            self.consume_newlines()
            value = self.expr()
            result.append((key, value))
            tt = self.token.kind
            if tt in (NEWLINE, COMMA):
                self.advance()
                tt = self.consume_newlines()
            elif tt not in (RCURLY, EOF):
                pe = ParserError(
                    'Unexpected %s at %s'
                    % (token_repr(self.token.kind), self.token.start)
                )
                pe.location = self.token.start
                raise pe
        return result

    def strings(self):
        result = self.token
        start = result.start
        s = result.value

        if self.advance() == STRING:
            all_text = []

            while True:
                all_text.append(s)
                s = self.token.value
                end = self.token.end
                if self.advance() != STRING:
                    break
            all_text.append(s)
            s = ''.join(all_text)
            result = Token(STRING, s, s)
            result.start = start
            result.end = end
        return result

    def list_body(self):
        result = ListBody()
        start = self.token.start
        end = self.token.end
        tt = self.consume_newlines()
        while tt in (
            LCURLY,
            LBRACK,
            LPAREN,
            AT,
            DOLLAR,
            BACKTICK,
            PLUS,
            MINUS,
            BITNOT,
            INTEGER,
            FLOAT,
            COMPLEX,
            TRUE,
            FALSE,
            NONE,
            NOT,
            STRING,
            WORD,
        ):
            value = self.expr()
            end = self.token.end
            result.append(value)
            tt = self.token.kind
            if tt not in (NEWLINE, COMMA):
                break
            self.advance()
            tt = self.consume_newlines()
        set_positions(result, start, end)
        return result

    def list(self):
        self.expect(LBRACK)
        result = self.list_body()
        self.expect(RBRACK)
        return result

    def value(self):
        tt = self.token.kind
        if tt not in VALUE_STARTERS:
            pe = ParserError(
                'Unexpected %s when looking for value: %s'
                % (token_repr(tt), self.token.start)
            )
            pe.location = self.token.start
            raise pe
        if tt == STRING:
            token = self.strings()
        else:
            token = self.token
            self.advance()
        return token

    def mapping(self):
        start = self.expect(LCURLY).start
        result = self.mapping_body()
        end = self.expect(RCURLY).end
        set_positions(result, start, end)
        return result

    def container(self):
        self.advance()
        k = self.consume_newlines()
        if k == LCURLY:
            result = self.mapping()
        elif k == LBRACK:
            result = self.list()
        elif k in (WORD, STRING, EOF):
            result = self.mapping_body()
        else:
            pe = ParserError(
                'Unexpected %s at %s' % (token_repr(self.token.kind), self.token.start)
            )
            pe.location = self.token.start
            raise pe
        self.consume_newlines()
        return result

    def atom(self):
        tt = self.token.kind
        if tt == LCURLY:
            result = self.mapping()
        elif tt == LBRACK:
            result = self.list()
        elif tt in VALUE_STARTERS:
            result = self.value()
        elif tt == DOLLAR:
            self.advance()
            self.expect(LCURLY)
            result = self.primary()
            self.expect(RCURLY)
            result = make_unary_expr(tt, result)
        elif tt == LPAREN:
            self.advance()
            result = self.expr()
            self.expect(RPAREN)
        else:
            # import pdb; pdb.set_trace()
            pe = ParserError(
                'Unexpected %s at %s' % (token_repr(self.token.kind), self.token.start)
            )
            pe.location = self.token.start
            raise pe
        return result

    # noinspection PyUnboundLocalVariable
    def trailer(self):
        tt = self.token.kind
        if tt != LBRACK:
            self.expect(DOT)
            result = self.expect(WORD)
        else:

            def get_slice_element():
                lb = self.list_body()
                n = len(lb)
                if n != 1:
                    invalid_index(n, lb.start)
                return lb[0]

            tt = self.advance()
            is_slice = False
            if tt == COLON:
                # it's a slice like [:xyz:abc]
                start = None
                is_slice = True
            else:
                elem = get_slice_element()
                tt = self.token.kind
                if tt != COLON:
                    result = elem
                else:
                    start = elem
                    is_slice = True
            if not is_slice:
                tt = LBRACK
            else:
                step = stop = None
                # at this point start is either None (if foo[:xyz]) or a
                # value representing the start. We are pointing at the COLON
                # after the start value
                tt = self.advance()
                if tt == COLON:  # no stop, but there might be a step
                    tt = self.advance()
                    if tt != RBRACK:
                        step = get_slice_element()
                elif tt != RBRACK:
                    stop = get_slice_element()
                    tt = self.token.kind
                    if tt == COLON:
                        tt = self.advance()
                        if tt != RBRACK:
                            step = get_slice_element()
                result = (start, stop, step)
                tt = COLON
            self.expect(RBRACK)
        return tt, result

    def primary(self):
        result = self.atom()
        while self.token.kind in (LBRACK, DOT):
            op, rhs = self.trailer()
            result = make_binary_expr(op, result, rhs)
        return result

    def power(self):
        result = self.primary()
        if self.token.kind == POWER:
            self.advance()
            rhs = self.u_expr()
            result = make_binary_expr(POWER, result, rhs)
        return result

    def u_expr(self):
        tt = self.token.kind
        if tt not in (PLUS, MINUS, BITNOT, AT):
            result = self.power()
        else:
            self.advance()
            result = make_unary_expr(tt, self.u_expr())
        return result

    def mul_expr(self):
        result = self.u_expr()
        while self.token.kind in (STAR, SLASH, SLASHSLASH, MODULO):
            op = self.token.kind
            self.advance()
            rhs = self.u_expr()
            result = make_binary_expr(op, result, rhs)
        return result

    def add_expr(self):
        result = self.mul_expr()
        while self.token.kind in (PLUS, MINUS):
            op = self.token.kind
            self.advance()
            rhs = self.mul_expr()
            result = make_binary_expr(op, result, rhs)
        return result

    def shift_expr(self):
        result = self.add_expr()
        while self.token.kind in (LSHIFT, RSHIFT):
            op = self.token.kind
            self.advance()
            rhs = self.add_expr()
            result = make_binary_expr(op, result, rhs)
        return result

    def bitand_expr(self):
        result = self.shift_expr()
        while self.token.kind == BITAND:
            self.advance()
            rhs = self.shift_expr()
            result = make_binary_expr(BITAND, result, rhs)
        return result

    def bitxor_expr(self):
        result = self.bitand_expr()
        while self.token.kind == BITXOR:
            self.advance()
            rhs = self.bitand_expr()
            result = make_binary_expr(BITXOR, result, rhs)
        return result

    def bitor_expr(self):
        result = self.bitxor_expr()
        while self.token.kind == BITOR:
            self.advance()
            rhs = self.bitxor_expr()
            result = make_binary_expr(BITOR, result, rhs)
        return result

    def comp_op(self):
        result = self.token.kind
        tt = self.advance()
        advance = False
        if result == IS and tt == NOT:
            result = 'is not'
            advance = True
        elif result == NOT and tt == IN:
            result = 'not in'
            advance = True
        if advance:
            self.advance()
        return result

    def comparison(self):
        result = self.bitor_expr()
        while self.token.kind in (LE, LT, GE, GT, EQ, NEQ, ALT_NEQ, IS, IN, NOT):
            op = self.comp_op()
            rhs = self.bitor_expr()
            result = make_binary_expr(op, result, rhs)
        return result

    def not_expr(self):
        if self.token.kind != NOT:
            result = self.comparison()
        else:
            self.advance()
            result = make_unary_expr(NOT, self.not_expr())
        return result

    def and_expr(self):
        result = self.not_expr()
        while self.token.kind == AND:
            self.advance()
            rhs = self.not_expr()
            result = make_binary_expr(AND, result, rhs)
        return result

    def or_expr(self):
        result = self.and_expr()
        while self.token.kind == OR:
            self.advance()
            rhs = self.and_expr()
            result = make_binary_expr(OR, result, rhs)
        return result

    expr = or_expr

    def parse(self, text, rule='mapping_body'):
        self._make_stream(text)
        self.advance()
        method = getattr(self, rule, None)
        if not method:
            raise ValueError('no such rule: %s' % rule)
        return method()
