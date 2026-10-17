# Causal Designs

A wiki of causal identification designs, built automatically from the design documents of the
[Danish Causal Atlas](https://johanna-einsiedler.github.io/danish-causal-atlas/) pipeline:
family (instrumental variables, difference in differences, …) → sub-design (shift-share instrument, staggered
adoption, …) → general pattern (stated with X for the treatment and Y for the outcome) → worked examples from
papers, each linked to the claim it identifies in the atlas. The exogeneity graph connects every source of
variation to the treatments it has been used to identify.

Live: https://johanna-einsiedler.github.io/causal-designs/  (the atlas links here with `?corpus=danish-register-econ`).

## Contents

- `index.html`, `app.js`, `app.css`, `vendor/`: the static site (no build step; D3 and MiniSearch vendored).
- `data/designs.json`: the taxonomy, the examples, the papers and the graph (built by `pipeline/build_designs.py`
  in the pipeline repository).
- `data/designs/<artid>.json`: one public design document per paper: every pointer into the paper (page,
  exhibit, cell and figure ids), the extractor's own descriptions of strategy, assumptions and population, and
  the printed estimates. Verbatim text from the papers is reduced to what quotation allows: one short anchor
  sentence per record and at most fifteen distinct sentences per paper, each with its page; every other quote is
  kept only as a hash and a length, so a reader with the paper can verify it. `data/index.json` lists the papers.

The papers remain with their publishers. Nothing here reproduces a paper's abstract, tables or figures.
