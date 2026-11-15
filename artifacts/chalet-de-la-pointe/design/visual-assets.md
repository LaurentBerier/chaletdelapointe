# Chalet artwork

The autumn cover and the misty lake are delivery crops of the site’s existing `Aerial_1777816601975.jpg` and `IMG_6664_1777733051950.jpg`. `public/media/chalet/` contains the web and email JPEGs. Keep these public filenames stable: delivered emails reference them on www.chaletdelapointe.com.

The following decorative illustrations were generated with the built-in image generator, then sized for web delivery:

**canoe.jpg** — Use case: illustration-story. An editorial spot illustration for a Quebec lakeside chalet’s guest journal: a single ochre canoe with one paddle, resting along two flowing lake ripples, one small clump of shoreline reeds. A vintage field-guide woodcut, hand-carved and printed in pine green and warm ochre on a uniform warm ivory paper (#faf8ef). Broad readable silhouette, delicate hatching, sparse negative space, horizontal 3:2 composition, centered isolated vignette occupying the middle 75%, all edges fade to plain paper. No letters, words, borders, or people.

**pine.jpg** — Use case: illustration-story. An editorial spot illustration for the same Quebec lakeside chalet: a short windswept white pine on a rocky point, a tiny ochre rising sun and two lake ripples. Vintage field-guide woodcut printed in deep pine green and muted ochre on uniform warm ivory paper (#faf8ef). Spare hand-carved marks, bold readable silhouette, delicate hatching. Horizontal 3:2 composition, centered isolated vignette occupying the middle 75%, all edges fade to plain paper. No letters, words, borders, buildings or people.

The four Supabase templates and booking notifications share `lib/shared/chalet-email.mts`. After an edit, run `pnpm --filter @workspace/scripts exec tsx email/render.ts`, deploy the assets, and update the hosted Auth templates with the generated HTML.
