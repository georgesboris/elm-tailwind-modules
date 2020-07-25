# Changelog
## v0.2.1 
Reduced unnecessary code generation of `Css.batch` when only one CSS declaration, also removed the exposing list to be `(..)` to reduce the LOC. In total, 36% code generation reduction.

## v0.2.0
The sheer number of duplicate functions that are generated due to media query definitions was causing big problems with tooling like elm-format. Since elm-css is a pre-processor, I thought we could do something a little better.

* All base utilities are now generated in a `TW/Utilities.elm` module. These do not include the media-query variants, just the base + pseudo selectors like active/hover.
* A new `TW/Breakpoints.elm` module is generated that includes a new `Breakpoint` opaque type and constructor functions for each of your breakpoints. This also includes a function to leverage the utilities with the signature:

```elm
atBreakpoint : List ( Breakpoint, Css.Style ) -> Css.Style
atBreakpoint styles =
```

This guarantees that each media query is generated in the right order so you don't get rules that override each other due to their definition order in the generated stylesheet from elm-css. You can use it like this:

```elm
    div [ css [ TW.bg_purple_200, atBreakpoint [ ( sm, TW.bg_red_800 ), ( lg, TW.bg_green_200 ) ] ] ]
        [ div []
            [ button [ css [ buttonStyle ] ] [ text "Button" ]
            ]
        
```

Sorry for such a big change right away, but I realized that if people can't use elm-format in their projects due to this, no one would find this very useful.

## v.0.1.0
Initial release. Raw function generation for (almost) every Tailwind utility