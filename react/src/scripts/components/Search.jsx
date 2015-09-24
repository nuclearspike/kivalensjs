'use strict';

import React from 'react/addons'
import Reflux from 'reflux'
import {Grid,Row,Col,Input,Button} from 'react-bootstrap';
import {LoanListItem,LoadingLoansModal} from '.';
import {loanActions, criteriaActions} from '../actions'
import {loanStore} from '../stores/loanStore'
import InfiniteList from 'react-infinite-list'
import {loans_from_kiva} from '../api/loans'

var Search = React.createClass({
    mixins: [Reflux.ListenerMixin, React.addons.LinkedStateMixin],
    getInitialState:function(){
        return {filtered_loans: loans_from_kiva, loan_count: loans_from_kiva.length}
    },
    componentDidMount: function() {
        //initial state works when flipping to Search after stuff is loaded. listenTo works when it's waiting
        //it should only fetch loans that are filtered.
        this.listenTo(loanActions.load.completed, loans => {
            console.log("listen:loanActions.load.completed")
            if (loans){
                this.setState({filtered_loans: loans, loan_count: loans.length})
            }
        })
        this.listenTo(criteriaActions.change, this.performSearch)
    },
    performSearch: function(c) {
        //break this into another unit --store? LoansAPI.filter(loans, criteria)
        var search_text = c.search_text;
        if (search_text) search_text = search_text.toUpperCase();
        //console.log("search_text:",search_text)
        var loans = loans_from_kiva

        if (search_text) {
            loans = loans.where(l => {
                return (l.name.toUpperCase().indexOf(search_text) >= 0)
                    || (l.location.country.toUpperCase().indexOf(search_text) >= 0)
                    || (l.sector.toUpperCase().indexOf(search_text) >= 0)
                    || (l.activity.toUpperCase().indexOf(search_text) >= 0)
            })
        }
        if (c.use)
            loans = loans.where(l => l.use.toUpperCase().indexOf(c.use.toUpperCase()) >= 0)
        if (c.country)
            loans = loans.where(l => l.location.country.toUpperCase().indexOf(c.country.toUpperCase()) >= 0)
        if (c.sector)
            loans = loans.where(l => l.sector.toUpperCase().indexOf(c.sector.toUpperCase()) >= 0)
        if (c.activity)
            loans = loans.where(l => l.activity.toUpperCase().indexOf(c.activity.toUpperCase()) >= 0)
        if (c.name)
            loans = loans.where(l => l.name.toUpperCase().indexOf(c.name.toUpperCase()) >= 0)
        this.setState({filtered_loans: loans, loan_count: loans.length});
    },
    render: function()  {
        console.log("Search:render()")
        var style = {height:'100%', width: '100%'};
        //var response = {"paging":{"page":1,"total":7460,"page_size":20,"pages":373},"loans":[{"id":942930,"name":"Nigube","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971310,"template_id":1},"activity":"Clothing","sector":"Clothing","use":"to purchase bales of clothes for resale","location":{"country_code":"KE","country":"Kenya","town":"Tiribe","geo":{"level":"town","pairs":"1 38","type":"point"}},"partner_id":164,"posted_date":"2015-09-06T16:50:09Z","planned_expiration_date":"2015-10-06T16:50:09Z","loan_amount":100,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943097,"name":"German","description":{"languages":["es","en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971598,"template_id":1},"activity":"Furniture Making","sector":"Manufacturing","use":"to buy wood, nails, a handsaw, a hammer, among other materials.","location":{"country_code":"NI","country":"Nicaragua","town":"Rivas","geo":{"level":"town","pairs":"11.3 -85.75","type":"point"}},"partner_id":176,"posted_date":"2015-09-06T16:50:09Z","planned_expiration_date":"2015-10-06T16:50:09Z","loan_amount":375,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943226,"name":"Sokkhom","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970897,"template_id":1},"activity":"Home Energy","sector":"Personal Use","themes":["Green"],"use":"to pay for solar home system.","location":{"country_code":"KH","country":"Cambodia","town":"Achen Village, Kampong Cham Commune, Sambo Distric","geo":{"level":"town","pairs":"13 105","type":"point"}},"partner_id":407,"posted_date":"2015-09-06T16:50:09Z","planned_expiration_date":"2015-10-06T16:50:09Z","loan_amount":650,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]},{"id":942926,"name":"Ali","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970951,"template_id":1},"activity":"Electronics Repair","sector":"Services","themes":["Rural Exclusion"],"use":"to buy spare parts for use in his mechanic's workshop.","location":{"country_code":"UG","country":"Uganda","town":"Bundibugyo","geo":{"level":"town","pairs":"2 33","type":"point"}},"partner_id":163,"posted_date":"2015-09-06T16:50:07Z","planned_expiration_date":"2015-10-06T16:50:07Z","loan_amount":125,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":942927,"name":"Amadan","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970941,"template_id":1},"activity":"General Store","sector":"Retail","themes":["Rural Exclusion"],"use":"to buy general merchadise such as salt, rice, maize flour and soap to sell.","location":{"country_code":"UG","country":"Uganda","town":"Bundibugyo","geo":{"level":"town","pairs":"2 33","type":"point"}},"partner_id":163,"posted_date":"2015-09-06T16:50:07Z","planned_expiration_date":"2015-10-06T16:50:07Z","loan_amount":700,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":942928,"name":"Harutyun","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971307,"template_id":1},"activity":"Education provider","sector":"Education","use":"to pay for that courses which will significantly help him in his teaching process and he will also buy some professional literature","location":{"country_code":"AM","country":"Armenia","town":"Vanadzor","geo":{"level":"town","pairs":"40 45","type":"point"}},"partner_id":146,"posted_date":"2015-09-06T16:50:05Z","planned_expiration_date":"2015-10-06T16:50:04Z","loan_amount":875,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]},{"id":943231,"name":"Jonalyn","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971728,"template_id":1},"activity":"Farming","sector":"Agriculture","use":"to buy fertilizers and other farm supplies","location":{"country_code":"PH","country":"Philippines","town":"Dumarao, Capiz","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:50:04Z","planned_expiration_date":"2015-10-06T16:50:04Z","loan_amount":325,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943232,"name":"Elsa","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971729,"template_id":1},"activity":"General Store","sector":"Retail","use":"to buy items to sell like canned goods, beverages, personal care products, and other groceries.","location":{"country_code":"PH","country":"Philippines","town":"Cordova, Cebu","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:50:04Z","planned_expiration_date":"2015-10-06T16:50:04Z","loan_amount":300,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943233,"name":"Evelyn","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971731,"template_id":1},"activity":"Pigs","sector":"Agriculture","use":"to buy feeds and other supplies to raise her pig","location":{"country_code":"PH","country":"Philippines","town":"Dumarao, Capiz","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:50:04Z","planned_expiration_date":"2015-10-06T16:50:04Z","loan_amount":200,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943234,"name":"Jeason","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971733,"template_id":1},"activity":"Crafts","sector":"Arts","use":"to buy shell covers, thread, and other materials needed in her business.","location":{"country_code":"PH","country":"Philippines","town":"Cordova, Cebu","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:50:04Z","planned_expiration_date":"2015-10-06T16:50:04Z","loan_amount":400,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943235,"name":"Imelda","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971735,"template_id":1},"activity":"Farming","sector":"Agriculture","use":"to buy fertilizers and other farm supplies","location":{"country_code":"PH","country":"Philippines","town":"Dumarao, Capiz","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:50:04Z","planned_expiration_date":"2015-10-06T16:50:04Z","loan_amount":275,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943236,"name":"Marian","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971738,"template_id":1},"activity":"Crafts","sector":"Arts","use":"to buy shell covers and other supplies to use in her business.","location":{"country_code":"PH","country":"Philippines","town":"Cordova, Cebu","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:50:04Z","planned_expiration_date":"2015-10-06T16:50:04Z","loan_amount":325,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943224,"name":"Seng Hong","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970910,"template_id":1},"activity":"Home Energy","sector":"Personal Use","themes":["Green"],"use":"to pay for solar home system","location":{"country_code":"KH","country":"Cambodia","town":"Achen Village, Kampong Cham Commune, Sambo Distric","geo":{"level":"town","pairs":"13 105","type":"point"}},"partner_id":407,"posted_date":"2015-09-06T16:40:04Z","planned_expiration_date":"2015-10-06T16:40:04Z","loan_amount":650,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]},{"id":943225,"name":"Vanna","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970901,"template_id":1},"activity":"Home Energy","sector":"Personal Use","themes":["Green"],"use":"to pay for solar home system.","location":{"country_code":"KH","country":"Cambodia","town":"Achen Village, Kampong Cham Commune, Sambo Distric","geo":{"level":"town","pairs":"13 105","type":"point"}},"partner_id":407,"posted_date":"2015-09-06T16:40:04Z","planned_expiration_date":"2015-10-06T16:40:04Z","loan_amount":650,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]},{"id":943229,"name":"Arlene","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971725,"template_id":1},"activity":"Crafts","sector":"Arts","use":"to buy more shells and other supplies to use in her business.","location":{"country_code":"PH","country":"Philippines","town":"Cordova, Cebu","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:40:03Z","planned_expiration_date":"2015-10-06T16:40:03Z","loan_amount":350,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943230,"name":"Belinda","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1971726,"template_id":1},"activity":"Charcoal Sales","sector":"Retail","use":"to buy more sacks of charcoal to sell","location":{"country_code":"PH","country":"Philippines","town":"Dumarao, Capiz","geo":{"level":"town","pairs":"13 122","type":"point"}},"partner_id":145,"posted_date":"2015-09-06T16:40:03Z","planned_expiration_date":"2015-10-06T16:40:03Z","loan_amount":125,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":true,"tags":[]},{"id":943220,"name":"Phallen","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970928,"template_id":1},"activity":"Home Energy","sector":"Personal Use","themes":["Green"],"use":"to pay for a solar home system.","location":{"country_code":"KH","country":"Cambodia","town":"Achen Village, Kampong Cham Commune, Sambo Distric","geo":{"level":"town","pairs":"13 105","type":"point"}},"partner_id":407,"posted_date":"2015-09-06T16:30:05Z","planned_expiration_date":"2015-10-06T16:30:04Z","loan_amount":650,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]},{"id":943221,"name":"Sokh Neat","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970921,"template_id":1},"activity":"Home Energy","sector":"Personal Use","themes":["Green"],"use":"to pay for a solar home system.","location":{"country_code":"KH","country":"Cambodia","town":"Achen Village, Kampong Cham Commune, Sambo Distric","geo":{"level":"town","pairs":"13 105","type":"point"}},"partner_id":407,"posted_date":"2015-09-06T16:30:05Z","planned_expiration_date":"2015-10-06T16:30:05Z","loan_amount":650,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]},{"id":943223,"name":"Sophal","description":{"languages":["en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1970917,"template_id":1},"activity":"Home Energy","sector":"Personal Use","themes":["Green"],"use":"to pay for a solar home system.","location":{"country_code":"KH","country":"Cambodia","town":"Achen Village, Kampong Cham Commune, Sambo Distric","geo":{"level":"town","pairs":"13 105","type":"point"}},"partner_id":407,"posted_date":"2015-09-06T16:30:05Z","planned_expiration_date":"2015-10-06T16:30:05Z","loan_amount":650,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]},{"id":941021,"name":"Essi","description":{"languages":["fr","en"]},"status":"fundraising","funded_amount":0,"basket_amount":0,"image":{"id":1968716,"template_id":1},"activity":"Home Products Sales","sector":"Retail","use":"to buy five dozen platters and five dozen cups.","location":{"country_code":"TG","country":"Togo","town":"Tokoin","geo":{"level":"town","pairs":"8 1.166667","type":"point"}},"partner_id":296,"posted_date":"2015-09-06T16:30:04Z","planned_expiration_date":"2015-10-06T16:30:04Z","loan_amount":100,"borrower_count":1,"lender_count":0,"bonus_credit_eligibility":false,"tags":[]}]}
        var modal = (<LoadingLoansModal show={loans_from_kiva.length == 0}/>)
        return (
            <Grid style={style} fluid >
            {modal}
                <Col md={4}>
                    <span>Count: {this.state.loan_count}</span>
                    <InfiniteList
                        className="loan_list_container"
                        items={this.state.filtered_loans}
                        height={600}
                        itemHeight={100}
                        listItemClass={LoanListItem}
                    />
                </Col>
                <Col md={8}>
                    {this.props.children}
                </Col>
            </Grid>
        );
    }
})

module.exports = Search;