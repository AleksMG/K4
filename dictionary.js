// dictionary.js v3.1
const CommonWords = [
    'THE', 'NORTH', 'EAST', 'OF', 'AND', 'CLOCK', 'IN', 'THAT', 'HAVE', 'BERLIN',
    'IT', 'FOR', 'NOT', 'ON', 'WITH', 'HE', 'AS', 'YOU', 'DO', 'AT',
    'THIS', 'BUT', 'HIS', 'BY', 'FROM', 'THEY', 'WE', 'SAY', 'HER',
    'SHE', 'OR', 'AN', 'WILL', 'MY', 'ONE', 'ALL', 'WOULD', 'THERE',
    'THEIR', 'WHAT', 'SO', 'UP', 'OUT', 'IF', 'ABOUT', 'WHO', 'GET',
    'WHICH', 'GO', 'ME', 'WHEN', 'MAKE', 'CAN', 'LIKE', 'TIME', 'NO',
    'JUST', 'HIM', 'KNOW', 'TAKE', 'PEOPLE', 'INTO', 'YEAR', 'YOUR',
    'GOOD', 'SOME', 'COULD', 'THEM', 'SEE', 'OTHER', 'THAN', 'THEN',
    'NOW', 'LOOK', 'ONLY', 'COME', 'ITS', 'OVER', 'THINK', 'ALSO',
    'BACK', 'AFTER', 'USE', 'TWO', 'HOW', 'OUR', 'WORK', 'FIRST', 'WELL',
    'WAY', 'EVEN', 'NEW', 'WANT', 'BECAUSE', 'ANY', 'THESE', 'GIVE', 'DAY',
    'MOST', 'US', 'IS', 'AM', 'ARE', 'WAS', 'WERE', 'BEEN', 'BEING',
    'HAVING', 'HAD', 'DOES', 'DID', 'DOING', 'WILL', 'SHALL', 'SHOULD',
    'WOULD', 'CAN', 'COULD', 'MAY', 'MIGHT', 'MUST', 'OUGHT', 'NEED',
    'DARE', 'USED', 'ABLE', 'MANY', 'MUCH', 'FEW', 'LITTLE', 'MORE',
    'MOST', 'SOME', 'ANY', 'NO', 'ALL', 'BOTH', 'EACH', 'EVERY', 'EITHER',
    'NEITHER', 'SUCH', 'ONLY', 'OWN', 'SAME', 'SO', 'THAN', 'TOO', 'VERY',
    'JUST', 'STILL', 'ALSO', 'EVEN', 'AGAIN', 'HERE', 'THERE', 'WHEN',
    'WHERE', 'WHY', 'HOW', 'WHILE', 'UNTIL', 'ALTHOUGH', 'THOUGH', 'IF',
    'UNLESS', 'WHETHER', 'BECAUSE', 'SINCE', 'SO', 'THAT', 'WHICH', 'WHO',
    'WHOM', 'WHOSE', 'WHAT', 'WHICH', 'WHATEVER', 'WHENEVER', 'WHEREVER',
    'WHICHEVER', 'WHOEVER', 'WHOMEVER'
];

const FrequencyDictionary = {
    ENGLISH: {
        'A': 0.08167, 'B': 0.01492, 'C': 0.02782, 'D': 0.04253,
        'E': 0.12702, 'F': 0.02228, 'G': 0.02015, 'H': 0.06094,
        'I': 0.06966, 'J': 0.00153, 'K': 0.00772, 'L': 0.04025,
        'M': 0.02406, 'N': 0.06749, 'O': 0.07507, 'P': 0.01929,
        'Q': 0.00095, 'R': 0.05987, 'S': 0.06327, 'T': 0.09056,
        'U': 0.02758, 'V': 0.00978, 'W': 0.02360, 'X': 0.00150,
        'Y': 0.01974, 'Z': 0.00074
    },
    RUSSIAN: {
        'А': 0.0801, 'Б': 0.0159, 'В': 0.0454, 'Г': 0.0170,
        'Д': 0.0298, 'Е': 0.0845, 'Ё': 0.0004, 'Ж': 0.0094,
        'З': 0.0165, 'И': 0.0735, 'Й': 0.0121, 'К': 0.0349,
        'Л': 0.0440, 'М': 0.0321, 'Н': 0.0670, 'О': 0.1097,
        'П': 0.0281, 'Р': 0.0473, 'С': 0.0547, 'Т': 0.0626,
        'У': 0.0262, 'Ф': 0.0026, 'Х': 0.0097, 'Ц': 0.0048,
        'Ч': 0.0144, 'Ш': 0.0073, 'Щ': 0.0036, 'Ъ': 0.0004,
        'Ы': 0.0190, 'Ь': 0.0174, 'Э': 0.0032, 'Ю': 0.0064,
        'Я': 0.0201
    }
};

const KeyPatterns = {
    COMMON: ['KEY', 'SECRET', 'PASSWORD', 'CRYPTO', 'ENIGMA', 'LOCK', 'CIPHER'],
    PATTERNS: {
        'ABC': 0.15,
        'AAA': 0.10,
        'QWERTY': 0.12,
        '123': 0.18,
        '321': 0.09
    }
};

export { CommonWords, FrequencyDictionary, KeyPatterns };
