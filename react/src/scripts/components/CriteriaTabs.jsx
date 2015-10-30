import React from 'react';
import LinkedStateMixin from 'react-addons-linked-state-mixin'
import Select from 'react-select';
import Slider from 'react-slider' // 'multi-slider' is incompatible with .14 presently
import Reflux from 'reflux'
import a from '../actions'
import s from '../stores/'
import {Grid,Row,Col,Input,Button,Tabs,Tab} from 'react-bootstrap';

var timeoutHandle=0

const CriteriaTabs = React.createClass({
    mixins: [Reflux.ListenerMixin, LinkedStateMixin],
    getInitialState: function () {
        return { activeTab: 1, state_count: 0, criteria_loan_use: '', criteria_loan_name: '', portfolioTab: '' }
    },
    componentWillMount: function(){
        this.state_count = 0
        this.options = {}
        this.setKnownOptions()
        this.reloadCriteria(s.criteria.syncGetLast()) //must be here or errors.
    },
    componentDidMount: function () {
        this.listenTo(a.loans.load.completed, this.loansReady)
        this.listenTo(a.criteria.lenderLoansEvent, this.lenderLoansEvent)
        this.listenTo(a.criteria.reload, this.reloadCriteria)
        if (kivaloans.loans_from_kiva.length) this.loansReady()
        this.criteriaChanged()
    },
    reloadCriteria(criteria = {}){
        this.last_criteria = $.extend(true, s.criteria.syncBlankCriteria(), criteria)
        this.setState({criteria_loan_use: this.last_criteria.loan.use, criteria_loan_name: this.last_criteria.loan.name}) //hack!
        this.forceUpdate()
        //console.log("###########  reload:", this.state)
        this.criteriaChanged()
    },
    lenderLoansEvent(event){
        //can be either started or done.
        var newState = {}
        newState.portfolioTab = (event == 'started') ? " (loading...)" : ""
        this.setState(newState)
        this.criteriaChanged()
    },
    loansReady: function(){
        this.options.activity = kivaloans.loans_from_kiva.select(loan => loan.activity).distinct().orderBy(name => name).select(a => {return {value: a, label: a}})
        this.options.country_code = kivaloans.countries.select(c => {return {label: c.name, value: c.iso_code}})
        this.setState({loansReady : true})
        this.criteriaChanged()
    },
    setKnownOptions: function(){
        //loan selects
        this.options.country_code = [{"label":"Afghanistan","value":"AF"},{"label":"Albania","value":"AL"},{"label":"Armenia","value":"AM"},{"label":"Azerbaijan","value":"AZ"},{"label":"Belize","value":"BZ"},{"label":"Benin","value":"BJ"},{"label":"Bolivia","value":"BO"},{"label":"Bosnia and Herzegovina","value":"BA"},{"label":"Brazil","value":"BR"},{"label":"Bulgaria","value":"BG"},{"label":"Burkina Faso","value":"BF"},{"label":"Burundi","value":"BI"},{"label":"Cambodia","value":"KH"},{"label":"Cameroon","value":"CM"},{"label":"Chad","value":"TD"},{"label":"Chile","value":"CL"},{"label":"China","value":"CN"},{"label":"Colombia","value":"CO"},{"label":"Congo","value":"CG"},{"label":"Costa Rica","value":"CR"},{"label":"Cote D'Ivoire","value":"CI"},{"label":"Dominican Republic","value":"DO"},{"label":"Ecuador","value":"EC"},{"label":"Egypt","value":"EG"},{"label":"El Salvador","value":"SV"},{"label":"Gaza","value":"GZ"},{"label":"Georgia","value":"GE"},{"label":"Ghana","value":"GH"},{"label":"Guatemala","value":"GT"},{"label":"Haiti","value":"HT"},{"label":"Honduras","value":"HN"},{"label":"India","value":"IN"},{"label":"Indonesia","value":"ID"},{"label":"Iraq","value":"IQ"},{"label":"Israel","value":"IL"},{"label":"Jordan","value":"JO"},{"label":"Kenya","value":"KE"},{"label":"Kosovo","value":"XK"},{"label":"Kyrgyzstan","value":"KG"},{"label":"Lao People's Democratic Republic","value":"LA"},{"label":"Lebanon","value":"LB"},{"label":"Lesotho","value":"LS"},{"label":"Liberia","value":"LR"},{"label":"Madagascar","value":"MG"},{"label":"Malawi","value":"MW"},{"label":"Mali","value":"ML"},{"label":"Mauritania","value":"MR"},{"label":"Mexico","value":"MX"},{"label":"Moldova","value":"MD"},{"label":"Mongolia","value":"MN"},{"label":"Mozambique","value":"MZ"},{"label":"Myanmar (Burma)","value":"MM"},{"label":"Namibia","value":"NA"},{"label":"Nepal","value":"NP"},{"label":"Nicaragua","value":"NI"},{"label":"Nigeria","value":"NG"},{"label":"Pakistan","value":"PK"},{"label":"Palestine","value":"PS"},{"label":"Panama","value":"PA"},{"label":"Papua New Guinea","value":"PG"},{"label":"Paraguay","value":"PY"},{"label":"Peru","value":"PE"},{"label":"Philippines","value":"PH"},{"label":"Rwanda","value":"RW"},{"label":"Saint Vincent and the Grenadines","value":"VC"},{"label":"Samoa","value":"WS"},{"label":"Senegal","value":"SN"},{"label":"Sierra Leone","value":"SL"},{"label":"Solomon Islands","value":"SB"},{"label":"Somalia","value":"SO"},{"label":"South Africa","value":"ZA"},{"label":"South Sudan","value":"QS"},{"label":"Sri Lanka","value":"LK"},{"label":"Suriname","value":"SR"},{"label":"Tajikistan","value":"TJ"},{"label":"Tanzania","value":"TZ"},{"label":"Thailand","value":"TH"},{"label":"The Democratic Republic of the Congo","value":"CD"},{"label":"Timor-Leste","value":"TL"},{"label":"Togo","value":"TG"},{"label":"Turkey","value":"TR"},{"label":"Uganda","value":"UG"},{"label":"Ukraine","value":"UA"},{"label":"United States","value":"US"},{"label":"Vanuatu","value":"VU"},{"label":"Vietnam","value":"VN"},{"label":"Yemen","value":"YE"},{"label":"Zambia","value":"ZM"},{"label":"Zimbabwe","value":"ZW"}]
        this.options.sector = [{"value":"Agriculture","label":"Agriculture"},{"value":"Arts","label":"Arts"},{"value":"Clothing","label":"Clothing"},{"value":"Construction","label":"Construction"},{"value":"Education","label":"Education"},{"value":"Entertainment","label":"Entertainment"},{"value":"Food","label":"Food"},{"value":"Health","label":"Health"},{"value":"Housing","label":"Housing"},{"value":"Manufacturing","label":"Manufacturing"},{"value":"Personal Use","label":"Personal Use"},{"value":"Retail","label":"Retail"},{"value":"Services","label":"Services"},{"value":"Transportation","label":"Transportation"},{"value":"Wholesale","label":"Wholesale"}]
        this.options.region = [{"value":"na","label":"North America"},{"value":"ca","label":"Central America"},{"value":"sa","label":"South America"},{"value":"af","label":"Africa"},{"value":"as","label":"Asia"},{"value":"me","label":"Middle East"},{"value":"ee","label":"Eastern Europe"},{"value":"oc","label":"Oceania"},{"value":"we","label":"Western Europe"}] //{"value":"an","label":"Antarctica"},
        this.options.tags = [{"value":"user_favorite","label":"User Favorite"},{"value":"volunteer_like","label":"Volunteer Like"},{"value":"volunteer_pick","label":"Volunteer Pick"},{"value":"#Animals","label":"#Animals"},{"value":"#Eco-friendly","label":"#Eco-friendly"},{"value":"#Elderly","label":"#Elderly"},{"value":"#Fabrics","label":"#Fabrics"},{"value":"#FemaleEducation","label":"#FemaleEducation"},{"value":"#FirstLoan","label":"#FirstLoan"},{"value":"#HealthAndSanitation","label":"#HealthAndSanitation"},{"value":"#IncomeProducingDurableAsset","label":"#IncomeProducingDurableAsset"},{"value":"#InspiringStory","label":"#InspiringStory"},{"value":"#InterestingPhoto","label":"#InterestingPhoto"},{"value":"#JobCreator","label":"#JobCreator"},{"value":"#Low-profitFP","label":"#Low-profitFP"},{"value":"#Orphan","label":"#Orphan"},{"value":"#Parent","label":"#Parent"},{"value":"#Refugee","label":"#Refugee"},{"value":"#RepeatBorrower","label":"#RepeatBorrower"},{"value":"#Schooling","label":"#Schooling"},{"value":"#Single","label":"#Single"},{"value":"#SingleParent","label":"#SingleParent"},{"value":"#SupportingFamily","label":"#SupportingFamily"},{"value":"#SustainableAg","label":"#SustainableAg"},{"value":"#Technology","label":"#Technology"},{"value":"#Trees","label":"#Trees"},{"value":"#Unique","label":"#Unique"},{"value":"#Vegan","label":"#Vegan"},{"value":"#Widowed","label":"#Widowed"},{"value":"#WomanOwnedBiz","label":"#WomanOwnedBiz"}]
        this.options.activity = []
        this.options.themes = [{"value":"Green","label":"Green"},{"value":"Higher Education","label":"Higher Education"},{"value":"Arab Youth","label":"Arab Youth"},{"value":"Kiva City LA","label":"Kiva City LA"},{"value":"Islamic Finance","label":"Islamic Finance"},{"value":"Youth","label":"Youth"},{"value":"Start-Up","label":"Start-Up"},{"value":"Water and Sanitation","label":"Water and Sanitation"},{"value":"Vulnerable Groups","label":"Vulnerable Groups"},{"value":"Fair Trade","label":"Fair Trade"},{"value":"Rural Exclusion","label":"Rural Exclusion"},{"value":"Mobile Technology","label":"Mobile Technology"},{"value":"Underfunded Areas","label":"Underfunded Areas"},{"value":"Conflict Zones","label":"Conflict Zones"},{"value":"Job Creation","label":"Job Creation"},{"value":"SME","label":"Small and Medium Enterprises"},{"value":"Growing Businesses","label":"Growing Businesses"},{"value":"Kiva City Detroit","label":"Kiva City Detroit"},{"value":"Health","label":"Health"},{"value":"Disaster recovery","label":"Disaster recovery"},{"value":"Flexible Credit Study","label":"Flexible Credit Study"},{"value":"Innovative Loans","label":"Innovative Loans"}].orderBy(c => c.label)

        //partner selects
        this.options.social_performance = [{"value":1,"label":"Anti-Poverty Focus"},{"value":3,"label":"Client Voice"},{"value":5,"label":"Entrepreneurial Support"},{"value":6,"label":"Facilitation of Savings"},{"value":4,"label":"Family and Community Empowerment"},{"value":7,"label":"Innovation"},{"value":2,"label":"Vulnerable Group Focus"}]
        this.options.sort = [{"value": null, label: "Date half is paid back, then 75%, then full (default)"},{value: "final_repayment", label: "Final repayment date"},{value:'newest',label:'Newest'},{value:'expiring',label:'Expiring'},{value:'popularity',label:'Popularity ($/hour)'}]

        //loan sliders
        this.options.repaid_in = {min: 2, max: 120}
        this.options.borrower_count = {min: 1, max: 20}
        this.options.percent_female = {min: 1, max: 100}
        this.options.still_needed = {min: 0, max: 1000, step: 25}
        this.options.expiring_in_days = {min: 0, max: 35}

        //partner sliders
        this.options.partner_risk_rating = {min: 0, max: 5, step: 0.5}
        this.options.partner_arrears = {min: 0, max: 50}
        this.options.partner_default = {min: 0, max: 30}
        this.options.portfolio_yield = {min: 0, max: 100}
        this.options.profit = {min: -100, max: 100}
        this.options.loans_at_risk_rate = {min: 0, max: 100}
        this.options.currency_exchange_loss_rate = {min: 0, max: 20}
    },
    buildCriteria: function(){
        console.log('buildCriteria:start')
        var getSelVal = (name) => this.refs[name].refs.value.value //todo: this is dumb. "refs.value" is a hidden input.

        var getSliderVal = function(criteria_group, ref){
            var arr = this.refs[ref].state.value.slice(0); //. slice to make a copy of the array. (state is private to the component. and therefore a hack)
            if (arr.length == 2) {
                if (arr[0] == this.options[ref].min) arr[0] = null
                if (arr[1] == this.options[ref].max) arr[1] = null
                criteria_group[`${ref}_min`] = arr[0]
                criteria_group[`${ref}_max`] = arr[1]
            }
        }.bind(this)

        var criteria = s.criteria.syncBlankCriteria()
        criteria.loan = {
            use: this.refs.use.getValue(),
            name: this.refs.name.getValue(),
            country_code: getSelVal('country_code'),
            sector: getSelVal('sector'),
            activity: getSelVal('activity'),
            themes: getSelVal('themes'),
            tags:  getSelVal('tags'),
            sort:  getSelVal('sort')
        }

        criteria.partner = {
            region: getSelVal('region'),
            social_performance: getSelVal('social_performance').split(',').where(sp => sp && !isNaN(sp)).select(sp => parseInt(sp))
        }

        criteria.portfolio = {
            exclude_portfolio_loans: this.refs.exclude_portfolio_loans.getChecked()
        }

        //
        var loan_sliders = ['repaid_in','borrower_count','percent_female','still_needed','expiring_in_days']
        loan_sliders.forEach(ref => getSliderVal(criteria.loan, ref))

        //if you add any to this array, it must change the criteriaStore as well for the meta
        var partner_sliders = ['partner_risk_rating','partner_arrears','partner_default','portfolio_yield','profit','loans_at_risk_rate','currency_exchange_loss_rate']
        partner_sliders.forEach(ref => getSliderVal(criteria.partner, ref))

        this.last_criteria = criteria
        this.state_count++
        this.setState({state_count: this.state_count})
        console.log("######### buildCriteria: criteria", criteria.loan, criteria.partner, criteria.portfolio)
        a.criteria.change(criteria)
    },
    criteriaChanged(){
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(this.buildCriteria, 150)
    },
    tabSelect: function(selectedKey){
        this.setState({activeTab: selectedKey});
        //hacky. multi-sliders dont like being on tabs. tab not show during initial render has locked components.
        setTimeout(()=> this.forceUpdate(), 500)
    },
    render: function() {
        var selectRow = function (props, group){
            var {ref, match, label, multi} = props
            var c_group = $.extend(true, {}, this.last_criteria[group])
            return <Row key={ref}>
                <Col md={2}>
                    <label className="control-label">{label}</label>
                </Col>
                <Col md={6}>
                    <Select multi={multi} value={c_group[ref]} ref={ref} options={this.options[ref]} clearable={multi} placeholder={(match)? `Match ${match} selected ${label}` : ''} onChange={this.criteriaChanged} />
                </Col>
            </Row>
        }.bind(this)

        var sliderRow = function(props, group){
            var {ref, label} = props
            var options = this.options[ref]
            var c_group = $.extend(true, {}, this.last_criteria[group])
            var min = c_group[`${ref}_min`] || options.min
            var max = c_group[`${ref}_max`] || options.max
            var display_min = min == options.min ? 'min' : min
            var display_max = max == options.max ? 'max' : max
            var defaults = [min, max]
            var step = options.step || 1  //${this.state.state_count}
            return (<Row key={`${ref}_`}>
                    <Col md={2}>
                        <label className="control-label">{label}</label>
                        <p>{display_min}-{display_max}</p>
                    </Col>
                    <Col md={6}>
                        <Slider ref={ref} className='horizontal-slider' min={options.min} max={options.max} defaultValue={defaults} step={step} withBars onChange={this.criteriaChanged} />
                    </Col>
                </Row>)
        }.bind(this)

        var loanCritSelects =  [{ref: 'country_code', label: 'Countries', match: 'any', multi: true },
            {ref: 'sector', label: 'Sectors', match: 'any' , multi: true},
            {ref: 'activity', label: 'Activities', match: 'any', multi: true },
            {ref: 'themes', label: 'Themes', match: 'all', multi: true },
            {ref: 'tags', label: 'Tags', match: 'all', multi: true },
            {ref: 'sort', label: 'Sort', match: '', multi: false }
        ]
        var loanCritSelectsComponents = loanCritSelects.map(opt => selectRow(opt, 'loan'))

        var loanCritSliders = [{ref: "repaid_in", label: "Repaid In (months)"},
            {ref: 'borrower_count', label: 'Borrower Count'},
            {ref: 'percent_female', label: 'Percent Female'},
            {ref: "still_needed", label: "Still Needed ($)"},
            {ref: "expiring_in_days", label: "Expiring In (days)"}
        ]
        var loanCritSlidersComponents = loanCritSliders.map(opt => sliderRow(opt, 'loan'))

        var partCritSelects = [{ref: 'region', label: 'Region', match: 'any', multi: true},
            {ref: 'social_performance', label: 'Social Performance', match: 'all', multi: true}]
        var partnerCritSelectsComponents = partCritSelects.map(opt => selectRow(opt, 'partner'))

        var partCritSliders = [{ref: 'partner_risk_rating', label: "Risk Rating (stars)"},
            {ref: 'partner_arrears', label: "Delinq Rate (%)"},
            {ref: 'partner_default', label: "Default Rate (%)"},
            {ref: 'portfolio_yield', label: "Portfolio Yield (%)"},
            {ref: 'profit', label: "Profit (%)"},
            {ref: 'loans_at_risk_rate', label: "Loans at Risk (%)"},
            {ref: 'currency_exchange_loss_rate', label: "Currency Exchange Loss (%)"}]
        var partnerCritsSlidersComponents = partCritSliders.map(opt => sliderRow(opt, 'partner'))

        var lender_loans_message = kivaloans.lender_loans_message

        return (<div>
            <Tabs activeKey={this.state.activeTab} onSelect={this.tabSelect}>
                <Tab eventKey={1} title="Borrower" className="ample-padding-top">
                    <Row>
                        <Input type='text' label='Use or Description' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='use' valueLink={this.linkState('criteria_loan_use')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Name' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='name' valueLink={this.linkState('criteria_loan_name')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    {loanCritSelectsComponents}
                    {loanCritSlidersComponents}
                </Tab>

                <Tab eventKey={2} title="Partner" className="ample-padding-top">
                    {partnerCritSelectsComponents}
                    {partnerCritsSlidersComponents}
                </Tab>

                <Tab eventKey={3} title={`Your Portfolio${this.state.portfolioTab}`} className="ample-padding-top">
                    <Row>
                        <Col md={9}>
                            <Input type="checkbox" ref='exclude_portfolio_loans' label={`Hide loans in my portfolio (${lender_loans_message})`} defaultChecked={this.last_criteria.portfolio.exclude_portfolio_loans} onClick={this.criteriaChanged} onChange={this.criteriaChanged} />
                        </Col>
                    </Row>
                </Tab>
            </Tabs>
            </div>
        );
    }
})
// Always Exclude list of IDs.
export default CriteriaTabs