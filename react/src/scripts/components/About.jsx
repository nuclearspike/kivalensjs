'use strict';
import React from 'react'
import {Grid} from 'react-bootstrap'

var About = React.createClass({
    render() {
        return (<Grid>
            <h1>About</h1>
            <h3>Being Rebuilt</h3>
            <p>
                KivaLens is currently being rebuilt. The Silverlight version is broken and I'm not going to fix it.
                Please <a href="mailto:liquidmonkey@gmail.com?subject=KivaLens" target="_blank">let me know</a> your favorite missing
                features and I'll implement those first. Please report any odd behaviors or bugs you find. You can also join
                the <a href="http://www.kiva.org/team/kivalens" target="_blank">KivaLens Team</a> to discuss.
            </p>

            <h3>Features</h3>
            <p>

                <ul>
                    <li>
                        Filtering by Final Repayment Date vs Repayment Terms. While Kiva allows you to sort by repayments,
                        it still shows you all loans. KivaLens lets you remove loans that don't match your selection for
                        final repayment. Also, KivaLens doesn't sort by the term for the borrower, but for the lender and
                        since different loans have different post and disbursal dates, this can make a big difference.
                    </li>

                    <li>
                        New Sort! You still have the ability to sort by final repayment date, but I've added a new sort
                        that will sort by when the loan is scheduled by percentages. Let's say you have 3 loans, all
                        with a final repayment date 3 months away. The new sort will prioritize which one pays more
                        quickly. Let's say loan #1 has a set amount you get back each month. #2 has a larger amount
                        on the first repayment then by the final it's very little and #3 doesn't get repaid at all
                        until the final repayment. The new sorts will prioritize by how quickly you get 50%, then
                        75% then 100% back. So for the loans above, #2 would be the first, then #1, then #3.
                    </li>

                    <li>Auto-complete drop-downs for Sector, Activity, Country, Region (new), Social Performance
                        Badges (new), Themes (new), Tags (new). Options marked as "new" were not possible before
                        on KivaLens and Tags cannot currently be used for filtering on Kiva...&amp; some are really
                        great (Inspiring Story, Interesting Photo, Volunteer Like, and a bunch more) and can help you
                        reduce the list even more if you still have too many to look through.
                    </li>

                    <li>
                        New range filters: in addition to all of the old ways of filtering, you can now filter by
                        "Loans at Risk %" and "Currency Loss %" for partners to further reduce your risk. These are
                        not available filters on Kiva.
                    </li>

                    <li>
                        Bulk Add! This is a favorite feature for previous KivaLens users and what I hear about the
                        most from mega-lenders that they are missing since the previous version of KivaLens bit the
                        dust in July of this year. Add tons of loans to your basket all at once.
                    </li>

                    <li>
                        Mobile! Since the new site is just HTML and Javascript rather than Silverlight, it will run
                        on everything and it's designed to automatically adapt to the size of the device
                        you're using, so if you're on a phone, it will hide the graphs, and stack everything into
                        one column, on a tablet, it displays differently depending on its orientation and
                        laptop-desktop have the easiest experience taking advantage of the width.
                    </li>

                    <li>
                        See graphs! View graphs that show the distribution of the current filter. Ex: Select
                        "Retail" as your Sector filter, and see how Retail loans are spread across Countries and
                        what Activities are available.
                    </li>

                    <li>
                        Live Filtering = Speed! Since it downloads the loans at the start and then filters them
                        locally, you get "as-you-type" filtering. Drag a slider around, pause for a second and watch
                        your results change right then.
                    </li>

                    <li>
                        Hide Loans you've already loaned money to so that you don't accidentally lend to them more
                        than you want. To use this, go to "Options" to input your kiva lender-id, then you'll need
                        to refresh the page for the change to take effect. From the Criteria "Portfolio" tab and
                        check the appropriate box.
                    </li>

                    <li>Saved Searches: Save your favorite searches to quickly jump back to them.</li>
                </ul>
            </p>

            <h3>History</h3>
            <p>
                KivaLens was initially created in 2009 (as a Silverlight plugin) because I wanted to find loans
                in ways and Kiva did not offer the filter/sorts I wanted. I ended up working at Kiva for a few years and incorporated a
                lot of the search features directly into Kiva's site which also then made their way into the API
                as well. So the need for KivaLens diminished but there are still some things that Kiva does not do
                that are handy. I have been working to re-implement KivaLens as a React app (pure HTML output,
                so it will work on all browsers with no plugin install, tablets and phones too). I've also
                open-sourced it, so feel free to <a href="mailto:liquidmonkey@gmail.com?subject=KivaLensDeveloper" target="_blank">email me</a> about
                working on it. You can check out the
                source code (in progress) at <a href="https://github.com/nuclearspike/kivalensjs/tree/master/react" target="_blank">my github repository</a>.
            </p>

            <h3>Kiva Lender Assistant Chrome Extension</h3>
            <p>
                There's also a Google Chrome browser extension I wrote that inserts repayment graph (sparklines)
                on the Lend tab along with other repayment info, talks to you about things it notices about the loan, details about lenders and
                teams you hover over, etc. <a href="https://chrome.google.com/webstore/detail/kiva-lender-assistant-bet/jkljjpdljndblihlcoenjbmdakaomhgo?hl=en-US" target="_blank">
                Check out screenshots, a detailed description and install Kiva Lender Assistant here.</a> or <a href="https://github.com/nuclearspike/lenderassist" target="_blank">checkout
                the source code on github (developers wanted!)</a>
            </p>
        </Grid>)
    }
})

export default About