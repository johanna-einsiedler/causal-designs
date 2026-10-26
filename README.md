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
- `data/corpora/<id>/`: one dataset per corpus: `designs/<artid>.json`, one public design document per paper
  (every pointer into the paper: page, exhibit, cell and figure ids; the extractor's own descriptions of strategy,
  assumptions and population; the printed estimates), `index.json` listing the papers, and `README.md`, the
  dataset card with its citation. Verbatim text from the papers is reduced to what quotation allows: one short
  anchor sentence per record and at most fifteen distinct sentences per paper, each with its page; every other
  quote is kept only as a hash and a length, so a reader with the paper can verify it.
- `data/dictionary.json`: the shared vocabulary of sub-designs, patterns and sources of variation, one for all
  corpora; `data/corpora.json`: the corpus registry (label, description, atlas, citation).

## Adding a corpus

A corpus is a folder `corpora/<id>/` of the pipeline repository. Run the pipeline on its papers, then
`DRE_CORPUS=<id> python pipeline/design_taxonomy.py --all` (placements into the shared dictionary),
`python pipeline/export_designs_public.py --corpus <id>` (the public design documents and the dataset card),
add the corpus to `designs/corpora.json`, and `python pipeline/build_designs.py --check` followed by
`zsh pipeline/deploy_designs.sh`. Designs written by hand can be added the same way: a placement file per paper
in the format of `extractions/design_taxonomy/<artid>.json` and a design document per paper.

## Licence

MIT, for the site (`LICENSE`) and for the design documents (`data/LICENSE`).

The papers remain with their publishers. Nothing here reproduces a paper's abstract, tables or figures.
