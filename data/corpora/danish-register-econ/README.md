# Causal designs in Danish register-data economics

Identification designs of economics papers that use Statistics Denmark's administrative registers, extracted from the papers by the danish-register-econ pipeline: one record per estimate, grouped into design units and placed in the shared design taxonomy.

244 papers · 3106 anchor quotes kept, 335074 quotes replaced by hashes · exported 2026-10-26

## How to cite

> Johanna Einsiedler (2026). Causal designs in Danish register-data economics [Data set]. https://github.com/johanna-einsiedler/causal-designs/tree/main/data/corpora/danish-register-econ

The claims the designs identify: Johanna Einsiedler (2026). Claims in Danish register-data economics papers (version 1) [Data set]. Metalens. https://doi.org/10.5281/zenodo.23514504

Atlas of the claims: https://johanna-einsiedler.github.io/danish-causal-atlas/

## Files

- `index.json`: the papers (artid, title, year, journal, DOI, record counts, strategies).
- `designs/<artid>.json`: one design document per paper: every pointer into the paper (page, exhibit, cell and figure ids), the extractor's own descriptions of strategy, assumptions, estimand and population, the printed estimates, and the registers used. Verbatim text is reduced to what quotation allows: one anchor sentence per record (at most 240 characters), at most 15 distinct sentences per paper, each with its page; every other quote is kept as a hash and a length so a reader with the paper can verify it. The papers remain with their publishers.

Licence: MIT (see `data/LICENSE` at the root of the data folder).
