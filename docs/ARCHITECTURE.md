# V2 Architecture

Browser: quiz, local Scent DNA, local catalog and UI.

Worker: web requests, secrets, normalization and provenance.

Provider: current search/product information.

The web layer supplements the Scent Engine instead of replacing it. A later production release should enrich web candidates into the same six Scent DNA dimensions before treating their match scores as equivalent to curated-catalog scores.
