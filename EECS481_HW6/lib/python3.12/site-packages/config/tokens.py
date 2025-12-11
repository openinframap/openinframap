# -*- coding: utf-8 -*-
#
# Copyright 2018-2021 by Vinay Sajip. All Rights Reserved.
#
from __future__ import unicode_literals

from string import digits
import sys

if sys.version_info[0] < 3:
    import bisect

    PRINTABLE_RANGES = [
        (32, 126),
        (161, 172),
        (174, 887),
        (890, 895),
        (900, 906),
        (908, 908),
        (910, 929),
        (931, 1327),
        (1329, 1366),
        (1369, 1375),
        (1377, 1415),
        (1417, 1418),
        (1421, 1423),
        (1425, 1479),
        (1488, 1514),
        (1520, 1524),
        (1542, 1563),
        (1566, 1756),
        (1758, 1805),
        (1808, 1866),
        (1869, 1969),
        (1984, 2042),
        (2048, 2093),
        (2096, 2110),
        (2112, 2139),
        (2142, 2142),
        (2208, 2228),
        (2275, 2435),
        (2437, 2444),
        (2447, 2448),
        (2451, 2472),
        (2474, 2480),
        (2482, 2482),
        (2486, 2489),
        (2492, 2500),
        (2503, 2504),
        (2507, 2510),
        (2519, 2519),
        (2524, 2525),
        (2527, 2531),
        (2534, 2555),
        (2561, 2563),
        (2565, 2570),
        (2575, 2576),
        (2579, 2600),
        (2602, 2608),
        (2610, 2611),
        (2613, 2614),
        (2616, 2617),
        (2620, 2620),
        (2622, 2626),
        (2631, 2632),
        (2635, 2637),
        (2641, 2641),
        (2649, 2652),
        (2654, 2654),
        (2662, 2677),
        (2689, 2691),
        (2693, 2701),
        (2703, 2705),
        (2707, 2728),
        (2730, 2736),
        (2738, 2739),
        (2741, 2745),
        (2748, 2757),
        (2759, 2761),
        (2763, 2765),
        (2768, 2768),
        (2784, 2787),
        (2790, 2801),
        (2809, 2809),
        (2817, 2819),
        (2821, 2828),
        (2831, 2832),
        (2835, 2856),
        (2858, 2864),
        (2866, 2867),
        (2869, 2873),
        (2876, 2884),
        (2887, 2888),
        (2891, 2893),
        (2902, 2903),
        (2908, 2909),
        (2911, 2915),
        (2918, 2935),
        (2946, 2947),
        (2949, 2954),
        (2958, 2960),
        (2962, 2965),
        (2969, 2970),
        (2972, 2972),
        (2974, 2975),
        (2979, 2980),
        (2984, 2986),
        (2990, 3001),
        (3006, 3010),
        (3014, 3016),
        (3018, 3021),
        (3024, 3024),
        (3031, 3031),
        (3046, 3066),
        (3072, 3075),
        (3077, 3084),
        (3086, 3088),
        (3090, 3112),
        (3114, 3129),
        (3133, 3140),
        (3142, 3144),
        (3146, 3149),
        (3157, 3158),
        (3160, 3162),
        (3168, 3171),
        (3174, 3183),
        (3192, 3199),
        (3201, 3203),
        (3205, 3212),
        (3214, 3216),
        (3218, 3240),
        (3242, 3251),
        (3253, 3257),
        (3260, 3268),
        (3270, 3272),
        (3274, 3277),
        (3285, 3286),
        (3294, 3294),
        (3296, 3299),
        (3302, 3311),
        (3313, 3314),
        (3329, 3331),
        (3333, 3340),
        (3342, 3344),
        (3346, 3386),
        (3389, 3396),
        (3398, 3400),
        (3402, 3406),
        (3415, 3415),
        (3423, 3427),
        (3430, 3445),
        (3449, 3455),
        (3458, 3459),
        (3461, 3478),
        (3482, 3505),
        (3507, 3515),
        (3517, 3517),
        (3520, 3526),
        (3530, 3530),
        (3535, 3540),
        (3542, 3542),
        (3544, 3551),
        (3558, 3567),
        (3570, 3572),
        (3585, 3642),
        (3647, 3675),
        (3713, 3714),
        (3716, 3716),
        (3719, 3720),
        (3722, 3722),
        (3725, 3725),
        (3732, 3735),
        (3737, 3743),
        (3745, 3747),
        (3749, 3749),
        (3751, 3751),
        (3754, 3755),
        (3757, 3769),
        (3771, 3773),
        (3776, 3780),
        (3782, 3782),
        (3784, 3789),
        (3792, 3801),
        (3804, 3807),
        (3840, 3911),
        (3913, 3948),
        (3953, 3991),
        (3993, 4028),
        (4030, 4044),
        (4046, 4058),
        (4096, 4293),
        (4295, 4295),
        (4301, 4301),
        (4304, 4680),
        (4682, 4685),
        (4688, 4694),
        (4696, 4696),
        (4698, 4701),
        (4704, 4744),
        (4746, 4749),
        (4752, 4784),
        (4786, 4789),
        (4792, 4798),
        (4800, 4800),
        (4802, 4805),
        (4808, 4822),
        (4824, 4880),
        (4882, 4885),
        (4888, 4954),
        (4957, 4988),
        (4992, 5017),
        (5024, 5109),
        (5112, 5117),
        (5120, 5759),
        (5761, 5788),
        (5792, 5880),
        (5888, 5900),
        (5902, 5908),
        (5920, 5942),
        (5952, 5971),
        (5984, 5996),
        (5998, 6000),
        (6002, 6003),
        (6016, 6109),
        (6112, 6121),
        (6128, 6137),
        (6144, 6157),
        (6160, 6169),
        (6176, 6263),
        (6272, 6314),
        (6320, 6389),
        (6400, 6430),
        (6432, 6443),
        (6448, 6459),
        (6464, 6464),
        (6468, 6509),
        (6512, 6516),
        (6528, 6571),
        (6576, 6601),
        (6608, 6618),
        (6622, 6683),
        (6686, 6750),
        (6752, 6780),
        (6783, 6793),
        (6800, 6809),
        (6816, 6829),
        (6832, 6846),
        (6912, 6987),
        (6992, 7036),
        (7040, 7155),
        (7164, 7223),
        (7227, 7241),
        (7245, 7295),
        (7360, 7367),
        (7376, 7414),
        (7416, 7417),
        (7424, 7669),
        (7676, 7957),
        (7960, 7965),
        (7968, 8005),
        (8008, 8013),
        (8016, 8023),
        (8025, 8025),
        (8027, 8027),
        (8029, 8029),
        (8031, 8061),
        (8064, 8116),
        (8118, 8132),
        (8134, 8147),
        (8150, 8155),
        (8157, 8175),
        (8178, 8180),
        (8182, 8190),
        (8208, 8231),
        (8240, 8286),
        (8304, 8305),
        (8308, 8334),
        (8336, 8348),
        (8352, 8382),
        (8400, 8432),
        (8448, 8587),
        (8592, 9210),
        (9216, 9254),
        (9280, 9290),
        (9312, 11123),
        (11126, 11157),
        (11160, 11193),
        (11197, 11208),
        (11210, 11217),
        (11244, 11247),
        (11264, 11310),
        (11312, 11358),
        (11360, 11507),
        (11513, 11557),
        (11559, 11559),
        (11565, 11565),
        (11568, 11623),
        (11631, 11632),
        (11647, 11670),
        (11680, 11686),
        (11688, 11694),
        (11696, 11702),
        (11704, 11710),
        (11712, 11718),
        (11720, 11726),
        (11728, 11734),
        (11736, 11742),
        (11744, 11842),
        (11904, 11929),
        (11931, 12019),
        (12032, 12245),
        (12272, 12283),
        (12289, 12351),
        (12353, 12438),
        (12441, 12543),
        (12549, 12589),
        (12593, 12686),
        (12688, 12730),
        (12736, 12771),
        (12784, 12830),
        (12832, 13054),
        (13056, 19893),
        (19904, 40917),
        (40960, 42124),
        (42128, 42182),
        (42192, 42539),
        (42560, 42743),
        (42752, 42925),
        (42928, 42935),
        (42999, 43051),
        (43056, 43065),
        (43072, 43127),
        (43136, 43204),
        (43214, 43225),
        (43232, 43261),
        (43264, 43347),
        (43359, 43388),
        (43392, 43469),
        (43471, 43481),
        (43486, 43518),
        (43520, 43574),
        (43584, 43597),
        (43600, 43609),
        (43612, 43714),
        (43739, 43766),
        (43777, 43782),
        (43785, 43790),
        (43793, 43798),
        (43808, 43814),
        (43816, 43822),
        (43824, 43877),
        (43888, 44013),
        (44016, 44025),
        (44032, 55203),
        (55216, 55238),
        (55243, 55291),
        (63744, 64109),
        (64112, 64217),
        (64256, 64262),
        (64275, 64279),
        (64285, 64310),
        (64312, 64316),
        (64318, 64318),
        (64320, 64321),
        (64323, 64324),
        (64326, 64449),
        (64467, 64831),
        (64848, 64911),
        (64914, 64967),
        (65008, 65021),
        (65024, 65049),
        (65056, 65106),
        (65108, 65126),
        (65128, 65131),
        (65136, 65140),
        (65142, 65276),
        (65281, 65470),
        (65474, 65479),
        (65482, 65487),
        (65490, 65495),
        (65498, 65500),
        (65504, 65510),
        (65512, 65518),
        (65532, 65533),
        (65536, 65547),
        (65549, 65574),
        (65576, 65594),
        (65596, 65597),
        (65599, 65613),
        (65616, 65629),
        (65664, 65786),
        (65792, 65794),
        (65799, 65843),
        (65847, 65932),
        (65936, 65947),
        (65952, 65952),
        (66000, 66045),
        (66176, 66204),
        (66208, 66256),
        (66272, 66299),
        (66304, 66339),
        (66352, 66378),
        (66384, 66426),
        (66432, 66461),
        (66463, 66499),
        (66504, 66517),
        (66560, 66717),
        (66720, 66729),
        (66816, 66855),
        (66864, 66915),
        (66927, 66927),
        (67072, 67382),
        (67392, 67413),
        (67424, 67431),
        (67584, 67589),
        (67592, 67592),
        (67594, 67637),
        (67639, 67640),
        (67644, 67644),
        (67647, 67669),
        (67671, 67742),
        (67751, 67759),
        (67808, 67826),
        (67828, 67829),
        (67835, 67867),
        (67871, 67897),
        (67903, 67903),
        (67968, 68023),
        (68028, 68047),
        (68050, 68099),
        (68101, 68102),
        (68108, 68115),
        (68117, 68119),
        (68121, 68147),
        (68152, 68154),
        (68159, 68167),
        (68176, 68184),
        (68192, 68255),
        (68288, 68326),
        (68331, 68342),
        (68352, 68405),
        (68409, 68437),
        (68440, 68466),
        (68472, 68497),
        (68505, 68508),
        (68521, 68527),
        (68608, 68680),
        (68736, 68786),
        (68800, 68850),
        (68858, 68863),
        (69216, 69246),
        (69632, 69709),
        (69714, 69743),
        (69759, 69820),
        (69822, 69825),
        (69840, 69864),
        (69872, 69881),
        (69888, 69940),
        (69942, 69955),
        (69968, 70006),
        (70016, 70093),
        (70096, 70111),
        (70113, 70132),
        (70144, 70161),
        (70163, 70205),
        (70272, 70278),
        (70280, 70280),
        (70282, 70285),
        (70287, 70301),
        (70303, 70313),
        (70320, 70378),
        (70384, 70393),
        (70400, 70403),
        (70405, 70412),
        (70415, 70416),
        (70419, 70440),
        (70442, 70448),
        (70450, 70451),
        (70453, 70457),
        (70460, 70468),
        (70471, 70472),
        (70475, 70477),
        (70480, 70480),
        (70487, 70487),
        (70493, 70499),
        (70502, 70508),
        (70512, 70516),
        (70784, 70855),
        (70864, 70873),
        (71040, 71093),
        (71096, 71133),
        (71168, 71236),
        (71248, 71257),
        (71296, 71351),
        (71360, 71369),
        (71424, 71449),
        (71453, 71467),
        (71472, 71487),
        (71840, 71922),
        (71935, 71935),
        (72384, 72440),
        (73728, 74649),
        (74752, 74862),
        (74864, 74868),
        (74880, 75075),
        (77824, 78894),
        (82944, 83526),
        (92160, 92728),
        (92736, 92766),
        (92768, 92777),
        (92782, 92783),
        (92880, 92909),
        (92912, 92917),
        (92928, 92997),
        (93008, 93017),
        (93019, 93025),
        (93027, 93047),
        (93053, 93071),
        (93952, 94020),
        (94032, 94078),
        (94095, 94111),
        (110592, 110593),
        (113664, 113770),
        (113776, 113788),
        (113792, 113800),
        (113808, 113817),
        (113820, 113823),
        (118784, 119029),
        (119040, 119078),
        (119081, 119154),
        (119163, 119272),
        (119296, 119365),
        (119552, 119638),
        (119648, 119665),
        (119808, 119892),
        (119894, 119964),
        (119966, 119967),
        (119970, 119970),
        (119973, 119974),
        (119977, 119980),
        (119982, 119993),
        (119995, 119995),
        (119997, 120003),
        (120005, 120069),
        (120071, 120074),
        (120077, 120084),
        (120086, 120092),
        (120094, 120121),
        (120123, 120126),
        (120128, 120132),
        (120134, 120134),
        (120138, 120144),
        (120146, 120485),
        (120488, 120779),
        (120782, 121483),
        (121499, 121503),
        (121505, 121519),
        (124928, 125124),
        (125127, 125142),
        (126464, 126467),
        (126469, 126495),
        (126497, 126498),
        (126500, 126500),
        (126503, 126503),
        (126505, 126514),
        (126516, 126519),
        (126521, 126521),
        (126523, 126523),
        (126530, 126530),
        (126535, 126535),
        (126537, 126537),
        (126539, 126539),
        (126541, 126543),
        (126545, 126546),
        (126548, 126548),
        (126551, 126551),
        (126553, 126553),
        (126555, 126555),
        (126557, 126557),
        (126559, 126559),
        (126561, 126562),
        (126564, 126564),
        (126567, 126570),
        (126572, 126578),
        (126580, 126583),
        (126585, 126588),
        (126590, 126590),
        (126592, 126601),
        (126603, 126619),
        (126625, 126627),
        (126629, 126633),
        (126635, 126651),
        (126704, 126705),
        (126976, 127019),
        (127024, 127123),
        (127136, 127150),
        (127153, 127167),
        (127169, 127183),
        (127185, 127221),
        (127232, 127244),
        (127248, 127278),
        (127280, 127339),
        (127344, 127386),
        (127462, 127490),
        (127504, 127546),
        (127552, 127560),
        (127568, 127569),
        (127744, 128377),
        (128379, 128419),
        (128421, 128720),
        (128736, 128748),
        (128752, 128755),
        (128768, 128883),
        (128896, 128980),
        (129024, 129035),
        (129040, 129095),
        (129104, 129113),
        (129120, 129159),
        (129168, 129197),
        (129296, 129304),
        (129408, 129412),
        (129472, 129472),
        (131072, 173782),
        (173824, 177972),
        (177984, 178205),
        (178208, 183969),
        (194560, 195101),
        (917760, 917999),
    ]

    def is_printable(c):
        oc = ord(c)
        i = bisect.bisect_right(PRINTABLE_RANGES, (oc, oc))
        if i >= len(PRINTABLE_RANGES):
            i -= 1
        lo, hi = PRINTABLE_RANGES[i]
        if i > 0 and oc < lo:
            lo, hi = PRINTABLE_RANGES[i - 1]
        return lo <= oc <= hi

    text_type = unicode
else:
    unichr = chr
    is_printable = lambda c: c.isprintable()
    text_type = str

WORD = 'a'
INTEGER = '0'
FLOAT = '1'
COMPLEX = 'j'
STRING = '"'
EOF = ''
NEWLINE = '\n'
LCURLY = '{'
RCURLY = '}'
LBRACK = '['
RBRACK = ']'
LPAREN = '('
RPAREN = ')'
LT = '<'
GT = '>'
LE = '<='
GE = '>='
EQ = '=='
ASSIGN = '='
NEQ = '!='
ALT_NEQ = '<>'
LSHIFT = '<<'
RSHIFT = '>>'
DOT = '.'
COMMA = ','
COLON = ':'
AT = '@'
PLUS = '+'
MINUS = '-'
STAR = '*'
POWER = '**'
SLASH = '/'
TILDE = '~'
SLASHSLASH = '//'
MODULO = '%'
BACKTICK = '`'
DOLLAR = '$'
TRUE = 'true'
FALSE = 'false'
NONE = 'null'
PYTRUE = 'True'
PYFALSE = 'False'
PYNONE = 'None'
IS = 'is'
IN = 'in'
NOT = 'not'
AND = 'and'
OR = 'or'
BITAND = '&'
BITOR = '|'
BITXOR = '^'
BITNOT = TILDE

WORDCHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_"
KEYWORDS = {TRUE, FALSE, NONE, IS, IN, NOT, AND, OR}
PUNCT = ':-+*/%,.{}[]()@$<>!~&|^'

PYKEYWORDS = {PYTRUE: TRUE, PYFALSE: FALSE, PYNONE: NONE}

KEYWORD_VALUES = {
    TRUE: True,
    PYTRUE: True,
    FALSE: False,
    PYFALSE: False,
    NONE: None,
    PYNONE: None,
}

SCALAR_TOKENS = {STRING, INTEGER, FLOAT, COMPLEX, FALSE, TRUE, NONE}


class RecognizerError(Exception):
    pass


class TokenizerError(RecognizerError):
    location = None


class Token(object):

    start = end = None

    def __init__(self, kind, text, value=None):
        self.kind = kind
        self.text = text
        self.value = value

    def __repr__(self):
        return 'Token(%s:%s:%s)' % (self.kind, self.text, self.value)

    def __eq__(self, other):
        if not isinstance(other, Token):
            return False
        return (self.kind == other.kind) and (self.value == other.value)


ESCAPES = {
    'a': '\a',
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t',
    'v': '\v',
    '\\': '\\',
    '\"': '\"',
    '\'': '\'',
    '/': '/',  # http://api.nobelprize.org/v1/prize.json escapes these
}


class Tokenizer(object):

    whitespace = ' \t\r\n'
    quotes = '\'"'
    punct = PUNCT
    wordchars = WORDCHARS
    identchars = WORDCHARS + digits

    def __init__(self, stream):
        self.stream = stream
        self.lineno = self.charline = 1
        self.colno = self.charcol = 1
        # self.lastc = None
        self.filename = getattr(stream, 'filename', '<unknown filename>')
        self.pbchars = []
        self.pbtokens = []

    @property
    def remaining(self):  # for debugging
        s = self.stream.getvalue()
        p = self.stream.tell()
        return s[p:]

    def push_back(self, c):
        if c:
            self.pbchars.append((c, self.charline, self.charcol))

    def get_char(self):
        """
        Get the next char from the stream. Update line and column numbers
        appropriately.

        :return: The next character from the stream.
        :rtype: str
        """
        if self.pbchars:
            t = self.pbchars.pop()
            c = t[0]
            self.charline = self.lineno = t[1]
            self.charcol = self.colno = t[2]
        else:
            self.charline = self.lineno
            self.charcol = self.colno
            c = self.stream.read(1)
        if c:
            if c != '\n':
                self.colno += 1
            else:
                self.lineno += 1
                self.colno = 1
        return c

    def get_token(self):
        """
        Get a token from the stream. The return value is (token_type, token_value).

        Multiline string tokenizing is thanks to David Janes (BlogMatrix)

        :return: The next token.
        :rtype: A token tuple.
        """
        if self.pbtokens:  # pragma: no cover
            return self.pbtokens.pop()
        stream = self.stream
        token = quoter = ''
        tt = EOF
        get_char = self.get_char

        # noinspection PyShadowingNames
        def get_number(token):
            tt = INTEGER
            in_exponent = False
            radix = 0
            dot_seen = token.find('.') >= 0
            last_was_digit = token[-1].isdigit()
            endline, endcol = self.charline, self.charcol
            while True:
                c = get_char()
                if c == '.':
                    dot_seen = True
                if not c:
                    break
                if c == '_':
                    if last_was_digit:
                        token += c
                        last_was_digit = False
                        endline, endcol = self.charline, self.charcol
                        continue
                    e = TokenizerError('Invalid \'_\' in number: %s' % token + c)
                    e.location = (self.charline, self.charcol)
                    raise e
                last_was_digit = False  # unless set in one of the clauses below
                if (radix == 0) and ('0' <= c <= '9'):
                    token += c
                    last_was_digit = True
                    endline, endcol = self.charline, self.charcol
                elif (radix == 2) and ('0' <= c <= '1'):
                    token += c
                    last_was_digit = True
                    endline, endcol = self.charline, self.charcol
                elif (radix == 8) and ('0' <= c <= '7'):
                    token += c
                    last_was_digit = True
                    endline, endcol = self.charline, self.charcol
                elif (radix == 16) and (
                    ('0' <= c <= '9') or ('a' <= c <= 'f') or ('A' <= c <= 'F')
                ):
                    token += c
                    last_was_digit = True
                    endline, endcol = self.charline, self.charcol
                elif c in 'OXoxBb' and token == '0':
                    if c in 'Oo':
                        radix = 8
                    elif c in 'Xx':
                        radix = 16
                    else:
                        radix = 2
                    token += c
                    endline, endcol = self.charline, self.charcol
                elif c == '.':
                    if (radix != 0) or token.find('.') >= 0 or in_exponent:
                        e = TokenizerError('Invalid character in number: %c' % c)
                        e.location = (self.charline, self.charcol)
                        raise e
                    else:
                        token += c
                        endline, endcol = self.charline, self.charcol
                elif (
                    (radix == 0)
                    and (c == '-')
                    and token.find('-', 1) < 0
                    and in_exponent
                ):
                    token += c
                    endline, endcol = self.charline, self.charcol
                elif (
                    (radix == 0)
                    and (c in 'eE')
                    and (token.find('e') < 0)
                    and (token.find('E') < 0)
                    and (token[-1] != '_')
                ):
                    token += c
                    endline, endcol = self.charline, self.charcol
                    in_exponent = True
                else:
                    break
            # reached the end of any actual number part. Before checking
            # for complex, ensure that the last char wasn't an underscore.
            if token[-1] == '_':
                e = TokenizerError('Invalid \'_\' at end of number: %s' % token)
                e.location = (self.charline, self.charcol - 1)
                raise e
            if c:
                if (radix == 0) and c in 'jJ':
                    token += c
                    endline, endcol = self.charline, self.charcol
                    tt = COMPLEX
                else:
                    if c != '.' and not c.isalnum():
                        self.push_back(c)
                    else:
                        e = TokenizerError('Invalid character in number: %c' % c)
                        e.location = (self.charline, self.charcol)
                        raise e
            try:
                s = token.replace('_', '')
                if radix:
                    value = int(s[2:], radix)
                elif token[-1] in 'jJ':
                    value = complex(s)
                elif in_exponent or dot_seen:
                    value = float(s)
                    tt = FLOAT
                else:
                    radix = 8 if s[0] == '0' else 10
                    value = int(s, radix)
            except ValueError:
                # str(token) so Unicode doesn't show u'prefix in repr
                e = TokenizerError('Badly-formed number: %r' % str(token))
                e.location = (startline, startcol)
                raise e
            return tt, token, value, endline, endcol

        # noinspection PyShadowingNames
        def parse_escapes(s):
            i = s.find('\\')
            if i < 0:
                result = s
            else:
                result = []
                failed = False
                while i >= 0:
                    n = len(s)
                    if i > 0:
                        result.append(s[:i])
                    c = s[i + 1]
                    # import pdb; pdb.set_trace()
                    if c in ESCAPES:
                        result.append(ESCAPES[c])
                        i += 2
                    elif c in 'xXuU':
                        if c in 'xX':
                            slen = 4
                        else:
                            slen = 6 if c == 'u' else 10
                        if (i + slen) > n:
                            failed = True
                            break
                        p = s[i + 2 : i + slen]
                        try:
                            d = int(p, 16)
                            if (0xD800 <= d <= 0xDFFF) or d >= 0x110000:
                                failed = True
                                break
                            result.append(unichr(d))
                            i += slen
                        except ValueError:
                            failed = True
                            break
                    else:
                        failed = True
                        break
                    s = s[i:]
                    i = s.find('\\')
                if failed:
                    e = TokenizerError(
                        'Invalid escape sequence at index %d: %s' % (i, s)
                    )
                    e.location = (startline, startcol)
                    raise e
                result.append(s)
                result = ''.join(result)
            return result

        value = None

        while True:
            c = get_char()
            startline = endline = self.charline
            startcol = endcol = self.charcol

            if not c:
                break
            elif c == '#':
                stream.readline()
                self.lineno += 1
                self.colno = 1
                endline, endcol = self.lineno, self.colno - 1
                tt = token = NEWLINE
                break
            elif c == '\n':
                endline, endcol = self.lineno, self.colno - 1
                tt = token = NEWLINE
                break
            elif c == '\r':
                c = get_char()
                if c != '\n':
                    self.push_back(c)
                tt = token = NEWLINE
                endline, endcol = self.charline, self.charcol
                break
            elif c == '\\':
                c = get_char()
                if c != '\n':
                    e = TokenizerError('Unexpected character: \\')
                    e.location = self.charline, self.charcol
                    raise e
                endline, endcol = self.charline, self.charcol
                continue
            elif c in self.whitespace:
                continue
            elif c == '`':
                token = quoter = c
                tt = BACKTICK
                endline, endcol = self.charline, self.charcol
                while True:
                    c = get_char()
                    if not c:
                        break
                    if not is_printable(c):
                        e = TokenizerError(
                            'Invalid char %c in `-string: \'%s\'' % (c, token)
                        )
                        e.location = (self.charline, self.charcol)
                        raise e
                    token += c
                    endline, endcol = self.charline, self.charcol
                    if c == quoter:
                        break
                if not c:
                    e = TokenizerError('Unterminated `-string: \'%s\'' % token)
                    e.location = (startline, startcol)
                    raise e
                break
            elif c in self.quotes:
                token = c
                endline, endcol = self.charline, self.charcol
                quote = c
                tt = STRING
                escaped = False
                multiline = False
                c1 = get_char()
                c1loc = (self.charline, self.charcol)
                if c1 != quote:
                    self.push_back(c1)
                else:
                    c2 = get_char()
                    if c2 != quote:
                        self.push_back(c2)
                        if not c2:
                            self.charline, self.charcol = c1loc
                        self.push_back(c1)
                    else:
                        multiline = True
                        token += quote
                        token += quote
                # Keep the quoting string around for later
                quoter = token
                while True:
                    c = get_char()
                    if not c:
                        break
                    token += c
                    endline, endcol = self.charline, self.charcol
                    if (c == quote) and not escaped:
                        if not multiline or (
                            len(token) >= 6
                            and token.endswith(token[:3])
                            and token[-4] != '\\'
                        ):
                            break
                    if c == '\\':
                        nc = get_char()
                        if nc == '\n':
                            token = token[:-1]  # lose the backslash we added
                            continue
                        else:
                            self.push_back(nc)
                            escaped = not escaped
                    else:
                        escaped = False
                if not c:
                    e = TokenizerError('Unterminated quoted string: %r' % token)
                    e.location = (startline, startcol)
                    raise e
                break
            elif c in self.wordchars:
                token = c
                endline, endcol = self.charline, self.charcol
                tt = WORD
                c = get_char()
                while c and (c in self.identchars):
                    token += c
                    endline, endcol = self.charline, self.charcol
                    c = get_char()
                self.push_back(c)
                if token in PYKEYWORDS:
                    token = PYKEYWORDS[token]
                if token in KEYWORDS:
                    value = KEYWORD_VALUES.get(token)
                    tt = token
                else:
                    value = token
                break
            elif c in digits:
                tt, token, value, endline, endcol = get_number(c)
                break
            elif c == '=':
                nc = get_char()
                if nc == '=':
                    token = c + nc
                    endline, endcol = self.charline, self.charcol
                    tt = token
                else:
                    tt = token = c
                    self.push_back(nc)
                break
            elif c in self.punct:
                token = tt = c
                endline, endcol = self.charline, self.charcol
                if c == '.':
                    c = get_char()
                    if c:
                        if c not in digits:
                            self.push_back(c)
                        else:
                            token += c
                            tt, token, value, endline, endcol = get_number(token)
                            break
                elif c == '-':
                    c = get_char()
                    if c:
                        if c in digits or c == '.':
                            token += c
                            tt, token, value, endline, endcol = get_number(token)
                        else:
                            self.push_back(c)
                elif token in ('<', '>', '!', '*', '/', '&', '|'):
                    c = get_char()
                    pb = True
                    if token == '<':
                        if c in '<>=':
                            token += c
                            endline, endcol = self.charline, self.charcol
                            tt = token if token != ALT_NEQ else NEQ
                            pb = False
                    elif token in ('&', '|') and c == token:
                        token += c
                        endline, endcol = self.charline, self.charcol
                        if c == '&':
                            tt = AND
                        else:
                            tt = OR
                        pb = False
                    elif token == '>':
                        if c in '>=':
                            token += c
                            endline, endcol = self.charline, self.charcol
                            tt = token
                            pb = False
                    elif token == '!':
                        if c == '=':
                            token += c
                            endline, endcol = self.charline, self.charcol
                            tt = token
                            pb = False
                        else:
                            tt = NOT
                    elif token in '*/=':
                        if c == token:
                            token += c
                            endline, endcol = self.charline, self.charcol
                            tt = token
                            pb = False
                    if pb:
                        self.push_back(c)
                break
            else:
                e = TokenizerError('Unexpected character: %r' % str(c))
                e.location = (self.charline, self.charcol)
                raise e
        if tt in (STRING, BACKTICK):
            n = len(quoter)
            assert n in (1, 3)
            assert token.startswith(quoter)
            assert token.endswith(quoter)
            try:
                value = parse_escapes(token[n:-n])
            except TokenizerError as e:
                e.location = (startline, startcol)
                raise e
        result = Token(tt, token, value)
        result.start = (startline, startcol)
        result.end = (endline, endcol)
        return result

    def __iter__(self):
        return self

    def next(self):
        result = self.get_token()
        if result.kind == EOF:
            raise StopIteration
        return result

    __next__ = next
