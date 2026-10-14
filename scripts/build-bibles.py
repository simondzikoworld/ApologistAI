"""Convert five public-domain Catholic Bibles into one static JSON layout.

Output (per translation code):
  <out>/<code>/index.json            {code, name, lang, psalms, books:[{id, ch}]}
  <out>/<code>/<OSIS book>/<n>.json  {"v": [[verse, "text"], ...]}

Usage: python build.py <src_dir> <out_dir> [--fill-de-from-gruenewald]
"""
import io
import json
import re
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from pysword.modules import SwordModules  # noqa: E402

# The 73-book Catholic canon in Catholic order (OSIS ids).
CANON = [
    "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam",
    "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Tob", "Jdt", "Esth", "1Macc",
    "2Macc", "Job", "Ps", "Prov", "Eccl", "Song", "Wis", "Sir", "Isa", "Jer", "Lam",
    "Bar", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah",
    "Hab", "Zeph", "Hag", "Zech", "Mal",
    "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph",
    "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas",
    "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev",
]
assert len(CANON) == 73

WS = re.compile(r"\s+")


def tidy(text: str) -> str:
    return WS.sub(" ", text).strip()


def from_sword(zip_path: Path, only=None) -> dict:
    mods = SwordModules(str(zip_path))
    key = list(mods.parse_modules().keys())[0]
    bible = mods.get_bible_from_module(key)
    books = {b.osis_name: b for t in ("ot", "nt") for b in bible.get_structure().get_books().get(t, [])}
    out = {}
    for osis in CANON:
        if osis not in books or (only and osis not in only):
            continue
        book = books[osis]
        chapters = {}
        for c in range(1, book.num_chapters + 1):
            texts = list(bible.get_iter(books=[osis], chapters=[c], clean=True))
            verses = [[i + 1, tidy(t)] for i, t in enumerate(texts) if tidy(t)]
            if verses:
                chapters[c] = verses
        out[osis] = chapters
    return out


ALLIOLI = {
    "Gen": "Gen", "Ex": "Exod", "Lev": "Lev", "Num": "Num", "Dtn": "Deut", "Jos": "Josh",
    "Ri": "Judg", "Rut": "Ruth", "1Sam": "1Sam", "2Sam": "2Sam", "1Kön": "1Kgs", "2Kön": "2Kgs",
    "1Chr": "1Chr", "2Chr": "2Chr", "Esr": "Ezra", "Neh": "Neh", "Tob": "Tob", "Jdt": "Jdt",
    "Est": "Esth", "1Makk": "1Macc", "2Makk": "2Macc", "Ijob": "Job", "Ps": "Ps", "Spr": "Prov",
    "Koh": "Eccl", "Hld": "Song", "Weish": "Wis", "Sir": "Sir", "Jes": "Isa", "Jer": "Jer",
    "Klgl": "Lam", "Bar": "Bar", "Ez": "Ezek", "Dan": "Dan", "Hos": "Hos", "Joel": "Joel",
    "Am": "Amos", "Obd": "Obad", "Jona": "Jonah", "Mi": "Mic", "Nah": "Nah", "Hab": "Hab",
    "Zef": "Zeph", "Hag": "Hag", "Sach": "Zech", "Mal": "Mal", "Mt": "Matt", "Mk": "Mark",
    "Lk": "Luke", "Joh": "John", "Apg": "Acts", "Röm": "Rom", "1Kor": "1Cor", "2Kor": "2Cor",
    "Gal": "Gal", "Eph": "Eph", "Phil": "Phil", "Kol": "Col", "1Thess": "1Thess",
    "2Thess": "2Thess", "1Tim": "1Tim", "2Tim": "2Tim", "Tit": "Titus", "Phlm": "Phlm",
    "Hebr": "Heb", "Jak": "Jas", "1Petr": "1Pet", "2Petr": "2Pet", "1Joh": "1John",
    "2Joh": "2John", "3Joh": "3John", "Jud": "Jude", "Offb": "Rev",
}
SUPERSCRIPTS = re.compile(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]+")
CROSSREF = re.compile(r"\s*\[[^\]]*\]")


def from_allioli(tsv: Path) -> dict:
    out: dict = {}
    for line in tsv.read_text(encoding="utf-8").splitlines():
        f = line.split("\t")
        # 7 fields = a verse row (Latin, German); 8 = a footnote; verse 0 = intro.
        if len(f) != 7 or not f[4].isdigit() or int(f[4]) == 0:
            continue
        osis = ALLIOLI.get(f[1])
        if not osis:
            print("  allioli: unknown book code", f[1])
            continue
        text = tidy(CROSSREF.sub("", SUPERSCRIPTS.sub("", f[6])))
        if text:
            out.setdefault(osis, {}).setdefault(int(f[3]), []).append([int(f[4]), text])
    return out


# poteznytomista/Biblia-Jakuba-Wujka- folders are "NN_<Polish abbr>". Their
# order is Vulgate (Maccabees close the OT), so map by abbreviation, not index.
WUJEK = {
    "Rdz": "Gen", "Wj": "Exod", "Kpł": "Lev", "Lb": "Num", "Pwt": "Deut", "Joz": "Josh",
    "Sdz": "Judg", "Rt": "Ruth", "1Sm": "1Sam", "2Sm": "2Sam", "1Krl": "1Kgs", "2Krl": "2Kgs",
    "1Krn": "1Chr", "2Krn": "2Chr", "Ezd": "Ezra", "Ne": "Neh", "Tb": "Tob", "Jdt": "Jdt",
    "Es": "Esth", "Hi": "Job", "Ps": "Ps", "Prz": "Prov", "Koh": "Eccl", "Pnp": "Song",
    "Mdr": "Wis", "Syr": "Sir", "Iz": "Isa", "Jr": "Jer", "Lm": "Lam", "Ba": "Bar", "Ez": "Ezek",
    "Dn": "Dan", "Oz": "Hos", "Jo": "Joel", "Am": "Amos", "Ab": "Obad", "Jon": "Jonah",
    "Mi": "Mic", "Na": "Nah", "Ha": "Hab", "So": "Zeph", "Ag": "Hag", "Za": "Zech", "Ml": "Mal",
    "1Mch": "1Macc", "2Mch": "2Macc", "Mt": "Matt", "Mk": "Mark", "Łk": "Luke", "J": "John",
    "Dz": "Acts", "Rz": "Rom", "1Kor": "1Cor", "2Kor": "2Cor", "Ga": "Gal", "Ef": "Eph",
    "Flp": "Phil", "Kol": "Col", "1Tes": "1Thess", "2Tes": "2Thess", "1Tm": "1Tim",
    "2Tm": "2Tim", "Tt": "Titus", "Fil": "Phlm", "Hbr": "Heb", "Jk": "Jas", "1P": "1Pet",
    "2P": "2Pet", "1J": "1John", "2J": "2John", "3J": "3John", "Jud": "Jude", "Ap": "Rev",
}


def from_wujek(ksiegi: Path) -> dict:
    import unicodedata
    out = {}
    for d in sorted(ksiegi.iterdir()):
        if not (d.is_dir() and d.name[:2].isdigit()):
            continue
        abbr = unicodedata.normalize("NFC", d.name.split("_", 1)[1])
        osis = WUJEK.get(abbr)
        if not osis:
            print("  wujek: skipping non-canonical folder", d.name)
            continue
        files: dict = {}
        for f in d.iterdir():
            stem = f.name.removesuffix(".txt")
            if not stem.isdigit():
                continue
            c = int(stem)
            # Some chapters exist twice (an empty stub "01" and the real "01.txt").
            if c not in files or f.stat().st_size > files[c].stat().st_size:
                files[c] = f
        chapters = {}
        for c in sorted(files):
            lines = [tidy(l) for l in files[c].read_text(encoding="utf-8").splitlines()]
            verses = [[i + 1, t] for i, t in enumerate(lines) if t]
            if verses:
                chapters[c] = verses
        out[osis] = chapters
    return out


# eBible verse-per-line files: "GEN 1:1 text". Book codes are eBible's own.
EBIBLE = {
    "GEN": "Gen", "EXO": "Exod", "LEV": "Lev", "NUM": "Num", "DEU": "Deut", "JOS": "Josh",
    "JDG": "Judg", "RUT": "Ruth", "1SA": "1Sam", "2SA": "2Sam", "1KI": "1Kgs", "2KI": "2Kgs",
    "1CH": "1Chr", "2CH": "2Chr", "EZR": "Ezra", "NEH": "Neh", "TOB": "Tob", "JDT": "Jdt",
    "EST": "Esth", "1MA": "1Macc", "2MA": "2Macc", "JOB": "Job", "PSA": "Ps", "PRO": "Prov",
    "ECC": "Eccl", "SOL": "Song", "WIS": "Wis", "SIR": "Sir", "ISA": "Isa", "JER": "Jer",
    "LAM": "Lam", "BAR": "Bar", "EZE": "Ezek", "DAN": "Dan", "HOS": "Hos", "JOE": "Joel",
    "AMO": "Amos", "OBA": "Obad", "JON": "Jonah", "MIC": "Mic", "NAH": "Nah", "HAB": "Hab",
    "ZEP": "Zeph", "HAG": "Hag", "ZEC": "Zech", "MAL": "Mal", "MAT": "Matt", "MAR": "Mark",
    "LUK": "Luke", "JOH": "John", "ACT": "Acts", "ROM": "Rom", "1CO": "1Cor", "2CO": "2Cor",
    "GAL": "Gal", "EPH": "Eph", "PHI": "Phil", "COL": "Col", "1TH": "1Thess", "2TH": "2Thess",
    "1TI": "1Tim", "2TI": "2Tim", "TIT": "Titus", "PHM": "Phlm", "HEB": "Heb", "JAM": "Jas",
    "1PE": "1Pet", "2PE": "2Pet", "1JO": "1John", "2JO": "2John", "3JO": "3John", "JUD": "Jude",
    "REV": "Rev",
}
VPL = re.compile(r"^(\w{3}) (\d+):(\d+) (.*)$")


def from_vpl(path: Path) -> dict:
    out: dict = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = VPL.match(line)
        if not m:
            continue
        osis = EBIBLE.get(m[1])
        if not osis:
            print("  vpl: unknown book code", m[1])
            continue
        text = tidy(m[4])
        if text:
            out.setdefault(osis, {}).setdefault(int(m[2]), []).append([int(m[3]), text])
    return out


def write(out_dir: Path, code: str, name: str, lang: str, psalms: str, data: dict, sources: dict):
    root = out_dir / code
    books = []
    for osis in CANON:
        chapters = data.get(osis)
        if not chapters:
            continue
        for c, verses in chapters.items():
            p = root / osis / f"{c}.json"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps({"v": verses}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        books.append({"id": osis, "ch": max(chapters)})
    index = {"code": code, "name": name, "lang": lang, "psalms": psalms, "books": books}
    if sources:
        index["sources"] = sources
    (root / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    missing = [b for b in CANON if b not in data or not data[b]]
    total = sum(len(v) for ch in data.values() for v in ch.values())
    print(f"{code}: {len(books)} books, {total} verses; missing: {missing or 'none'}")


def peek(data: dict, osis: str, c: int, v: int = 1) -> str:
    for n, t in data.get(osis, {}).get(c, []):
        if n == v:
            return t[:90]
    return "(none)"


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    fill_de = "--fill-de-from-gruenewald" in sys.argv

    jobs = [
        ("drc", "Douay-Rheims (Challoner)", "EN", "vulgate", from_sword(src / "sword/DRC.zip")),
        # CrossWire's Crampon 1923 module runs whole passages into one verse
        # (e.g. Job 10:1-20 sits inside 9:35), so use eBible's clean
        # néo-Crampon Libre (CC BY-SA 4.0) instead.
        ("neocrampon", "Néo-Crampon Libre", "FR", "hebrew", from_vpl(src / "francl/vpl/francl_vpl.txt")),
        ("platense", "Biblia Platense (Straubinger)", "ES", "vulgate", from_sword(src / "sword/SpaPlatense.zip")),
        ("wujek", "Biblia Jakuba Wujka", "PL", "vulgate", from_wujek(src / "wujek-pt/ksiegi")),
    ]
    allioli = from_allioli(src / "allioli/allioli.tsv")
    de_sources = {}
    if fill_de:
        gw_name = "Grünewald-Bibel 1924"
        gaps = [b for b in CANON if b not in allioli]
        gw = from_sword(src / "sword/GerGruenewald.zip", only=set(gaps) | {"Zech", "Mal"})
        for b in gaps:
            if b in gw:
                allioli[b] = gw[b]
                de_sources[b] = gw_name
        # Single chapters the Allioli text lacks.
        if 14 not in allioli.get("Zech", {}) and 14 in gw.get("Zech", {}):
            allioli["Zech"][14] = gw["Zech"][14]
            de_sources["Zech.14"] = gw_name
        if 4 not in allioli.get("Mal", {}):
            # Vulgate Mal 4:1-6 = Hebrew-numbered Mal 3:19-24 (Grünewald's
            # module already uses the 4-chapter split).
            tail = gw.get("Mal", {}).get(4) or [
                [n - 18, t] for n, t in gw.get("Mal", {}).get(3, []) if n >= 19
            ]
            if tail:
                allioli["Mal"][4] = tail
                de_sources["Mal.4"] = gw_name
    jobs.append(("allioli", "Allioli-Bibel", "DE", "vulgate", allioli))

    for code, name, lang, psalms, data in jobs:
        print(f"  {code} check — Ps 22:1 «{peek(data, 'Ps', 22)}» | Ps 23:1 «{peek(data, 'Ps', 23)}»")
        # Chapters must be written in numeric order for index "ch" (max) to be right.
        for b in data:
            data[b] = dict(sorted(data[b].items()))
        write(out, code, name, lang, psalms, data, de_sources if code == "allioli" else {})


if __name__ == "__main__":
    main()
