'use strict';
import React from 'react'
import {Grid} from 'react-bootstrap'

var About = React.createClass({
    render() {
        return (<Grid>
            <h1>About</h1>
            <p>
                KivaLens is currently being rebuilt. The Silverlight version is broken and I'm not planning to fix it.
                Please <a href="mailto:liquidmonkey@gmail.com" target="_blank">let me know</a> your favorite missing
                features and I'll implement those first. You can also join
                the <a href="http://www.kiva.org/team/kivalens" target="_blank">KivaLens Team</a> to discuss.
            </p>
            <p>
                KivaLens was initially created in 2009 (as a Silverlight plugin) because I wanted to find loans
                in ways that Kiva did not offer filter/sorts for. I ended up working at Kiva for a few years and incorporated a
                lot of the search features directly into Kiva's site which also then made their way into the API
                as well. So the need for KivaLens diminished but there are still some things that Kiva does not do
                that are handy. I have been working to re-implement KivaLens as a React app (pure HTML output,
                so it will work on all browsers with no plugin install, tablets and phones too). I've also
                open-sourced it, so feel free to <a href="mailto:liquidmonkey@gmail.com" target="_blank">email me</a> about
                working on it. You can check out the
                source code (in progress) at <a href="https://github.com/nuclearspike/kivalensjs/tree/master/react" target="_blank">my github repository</a>.
            </p>

            <p>
                There's also a Google Chrome browser extension I wrote that inserts repayment graph (sparklines)
                on the Lend tab, talks to you about things it notices about the loan, details about lenders and
                teams you hover over, etc. <a href="https://chrome.google.com/webstore/detail/kiva-lender-assistant-bet/jkljjpdljndblihlcoenjbmdakaomhgo?hl=en-US" target="_blank">
                Check out screenshots, a detailed description and install Kiva Lender Assistant here.</a> or <a href="https://github.com/nuclearspike/lenderassist" target="_blank">checkout
                the source code on github (developers wanted!)</a>
            </p>
        </Grid>)
    }
})

export default About