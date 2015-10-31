import React from 'react';
import LinkedStateMixin from 'react-addons-linked-state-mixin'
import Select from 'react-select';
import Slider from 'react-slider' // 'multi-slider' is incompatible with .14 presently
import Reflux from 'reflux'
import a from '../actions'
import s from '../stores/'
import {Grid,Row,Col,Input,Button,Tabs,Tab} from 'react-bootstrap';
import {Cursor, ImmutableOptimizations} from 'react-cursor'

var timeoutHandle=0

const InputRow = React.createClass({
    mixins: [ImmutableOptimizations(['group'])],
    propTypes: {
        label: React.PropTypes.string.isRequired,
        group: React.PropTypes.instanceOf(Cursor).isRequired,
        name: React.PropTypes.string.isRequired,
        onChange: React.PropTypes.func.isRequired
    },
    inputChange(){
        this.props.group.refine(this.props.name).set(this.refs.input.getValue())
        this.props.onChange()
    },
    render(){
        return (<Row>
            <Input type='text' label={this.props.label} labelClassName='col-md-2' wrapperClassName='col-md-6' ref='input' defaultValue={this.props.group.refine(this.props.name).value} onKeyUp={this.inputChange} />
        </Row>)
    }
})

const SelectRow = React.createClass({
    mixins: [ImmutableOptimizations(['group'])],
    propTypes: {
        options: React.PropTypes.instanceOf(Object).isRequired,
        group: React.PropTypes.instanceOf(Cursor).isRequired,
        name: React.PropTypes.string.isRequired,
        onChange: React.PropTypes.func.isRequired
    },
    propertyCursor(){
        return this.props.group.refine(this.props.name)
    },
    selectChange(value, values){
        this.propertyCursor().set(value)
        this.props.onChange()
    },
    render(){
        var options = this.props.options
        return <Row>
            <Col md={2}>
                <label className="control-label">{options.label}</label>
            </Col>
            <Col md={6}>
                <Select multi={options.multi} ref='select' value={this.propertyCursor().value} options={options.select_options} clearable={options.multi} placeholder={(options.match)? `Match ${options.match} selected ${options.label}` : ''} onChange={this.selectChange} />
            </Col>
        </Row>
    }
})

const SliderRow = React.createClass({
    mixins: [ImmutableOptimizations(['group'])],
    propTypes: {
        options: React.PropTypes.instanceOf(Object).isRequired,
        group: React.PropTypes.instanceOf(Cursor).isRequired,
        name: React.PropTypes.string.isRequired,
        onChange: React.PropTypes.func.isRequired
    },
    pickValue(crit_facet, defaultValue){
        return (crit_facet === null || crit_facet === undefined) ? defaultValue : crit_facet
    },
    sliderChange(){
        var arr = this.refs.slider.state.value.slice(0);
        if (arr.length == 2) {
            if (arr[0] == this.props.options.min) arr[0] = null
            if (arr[1] == this.props.options.max) arr[1] = null
            //todo: only set if different
            //if (this.group.refine(`${this.props.name}_min`) )

            this.props.group.refine(`${this.props.name}_min`).set(arr[0])
            this.props.group.refine(`${this.props.name}_max`).set(arr[1])
            this.props.onChange()
        }
    },
    render() {
        var ref = this.props.name
        var options = this.props.options
        var c_group = this.props.group.value

        var min = this.pickValue(c_group[`${ref}_min`], options.min)
        var max = this.pickValue(c_group[`${ref}_max`], options.max)
        var display_min = min == options.min ? 'min' : min
        var display_max = max == options.max ? 'max' : max
        var defaults = [min, max]
        var step = options.step || 1
        return (<Row>
            <Col md={2}>
                <label className="control-label">{options.label}</label>
                <p>{display_min}-{display_max}</p>
            </Col>
            <Col md={6}>
                <Slider ref='slider' className='horizontal-slider' min={options.min} max={options.max} defaultValue={defaults} step={step} withBars onChange={this.sliderChange} />
            </Col>
        </Row>)
    }
})

const CriteriaTabs = React.createClass({
    mixins: [Reflux.ListenerMixin, LinkedStateMixin],
    getInitialState: function () {
        return { activeTab: 1, state_count: 0, tab_flips: 0, portfolioTab: '', criteria: s.criteria.syncGetLast()}
    },
    componentWillMount: function(){
        this.state_count = 0
        this.tab_flips = 0
        this.options = {}
        this.setKnownOptions()
    },
    componentDidMount: function () {
        this.listenTo(a.loans.load.completed, this.loansReady)
        this.listenTo(a.criteria.lenderLoansEvent, this.lenderLoansEvent)
        this.listenTo(a.criteria.reload, this.reloadCriteria)
        if (kivaloans.loans_from_kiva.length) this.loansReady()
        this.criteriaChanged()
    },
    reloadCriteria(criteria = {}){
        this.setState({criteria: $.extend(true, s.criteria.syncBlankCriteria(), criteria)})
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
        this.options.activity.select_options = kivaloans.loans_from_kiva.select(loan => loan.activity).distinct().orderBy(name => name).select(a => {return {value: a, label: a}})
        this.options.country_code.select_options = kivaloans.countries.select(c => {return {label: c.name, value: c.iso_code}})
        this.setState({loansReady : true})
        this.criteriaChanged()
    },
    setKnownOptions: function(){
        //loan selects
        this.options.country_code = {ref: 'country_code', label: 'Countries', match: 'any', multi: true, select_options: [{"label":"Afghanistan","value":"AF"},{"label":"Albania","value":"AL"},{"label":"Armenia","value":"AM"},{"label":"Azerbaijan","value":"AZ"},{"label":"Belize","value":"BZ"},{"label":"Benin","value":"BJ"},{"label":"Bolivia","value":"BO"},{"label":"Bosnia and Herzegovina","value":"BA"},{"label":"Brazil","value":"BR"},{"label":"Bulgaria","value":"BG"},{"label":"Burkina Faso","value":"BF"},{"label":"Burundi","value":"BI"},{"label":"Cambodia","value":"KH"},{"label":"Cameroon","value":"CM"},{"label":"Chad","value":"TD"},{"label":"Chile","value":"CL"},{"label":"China","value":"CN"},{"label":"Colombia","value":"CO"},{"label":"Congo","value":"CG"},{"label":"Costa Rica","value":"CR"},{"label":"Cote D'Ivoire","value":"CI"},{"label":"Dominican Republic","value":"DO"},{"label":"Ecuador","value":"EC"},{"label":"Egypt","value":"EG"},{"label":"El Salvador","value":"SV"},{"label":"Gaza","value":"GZ"},{"label":"Georgia","value":"GE"},{"label":"Ghana","value":"GH"},{"label":"Guatemala","value":"GT"},{"label":"Haiti","value":"HT"},{"label":"Honduras","value":"HN"},{"label":"India","value":"IN"},{"label":"Indonesia","value":"ID"},{"label":"Iraq","value":"IQ"},{"label":"Israel","value":"IL"},{"label":"Jordan","value":"JO"},{"label":"Kenya","value":"KE"},{"label":"Kosovo","value":"XK"},{"label":"Kyrgyzstan","value":"KG"},{"label":"Lao People's Democratic Republic","value":"LA"},{"label":"Lebanon","value":"LB"},{"label":"Lesotho","value":"LS"},{"label":"Liberia","value":"LR"},{"label":"Madagascar","value":"MG"},{"label":"Malawi","value":"MW"},{"label":"Mali","value":"ML"},{"label":"Mauritania","value":"MR"},{"label":"Mexico","value":"MX"},{"label":"Moldova","value":"MD"},{"label":"Mongolia","value":"MN"},{"label":"Mozambique","value":"MZ"},{"label":"Myanmar (Burma)","value":"MM"},{"label":"Namibia","value":"NA"},{"label":"Nepal","value":"NP"},{"label":"Nicaragua","value":"NI"},{"label":"Nigeria","value":"NG"},{"label":"Pakistan","value":"PK"},{"label":"Palestine","value":"PS"},{"label":"Panama","value":"PA"},{"label":"Papua New Guinea","value":"PG"},{"label":"Paraguay","value":"PY"},{"label":"Peru","value":"PE"},{"label":"Philippines","value":"PH"},{"label":"Rwanda","value":"RW"},{"label":"Saint Vincent and the Grenadines","value":"VC"},{"label":"Samoa","value":"WS"},{"label":"Senegal","value":"SN"},{"label":"Sierra Leone","value":"SL"},{"label":"Solomon Islands","value":"SB"},{"label":"Somalia","value":"SO"},{"label":"South Africa","value":"ZA"},{"label":"South Sudan","value":"QS"},{"label":"Sri Lanka","value":"LK"},{"label":"Suriname","value":"SR"},{"label":"Tajikistan","value":"TJ"},{"label":"Tanzania","value":"TZ"},{"label":"Thailand","value":"TH"},{"label":"The Democratic Republic of the Congo","value":"CD"},{"label":"Timor-Leste","value":"TL"},{"label":"Togo","value":"TG"},{"label":"Turkey","value":"TR"},{"label":"Uganda","value":"UG"},{"label":"Ukraine","value":"UA"},{"label":"United States","value":"US"},{"label":"Vanuatu","value":"VU"},{"label":"Vietnam","value":"VN"},{"label":"Yemen","value":"YE"},{"label":"Zambia","value":"ZM"},{"label":"Zimbabwe","value":"ZW"}]}
        this.options.sector = {ref: 'sector', label: 'Sectors', match: 'any' , multi: true, select_options: [{"value":"Agriculture","label":"Agriculture"},{"value":"Arts","label":"Arts"},{"value":"Clothing","label":"Clothing"},{"value":"Construction","label":"Construction"},{"value":"Education","label":"Education"},{"value":"Entertainment","label":"Entertainment"},{"value":"Food","label":"Food"},{"value":"Health","label":"Health"},{"value":"Housing","label":"Housing"},{"value":"Manufacturing","label":"Manufacturing"},{"value":"Personal Use","label":"Personal Use"},{"value":"Retail","label":"Retail"},{"value":"Services","label":"Services"},{"value":"Transportation","label":"Transportation"},{"value":"Wholesale","label":"Wholesale"}]}
        this.options.tags = {ref: 'tags', label: 'Tags', match: 'all', multi: true, select_options: [{"value":"user_favorite","label":"User Favorite"},{"value":"volunteer_like","label":"Volunteer Like"},{"value":"volunteer_pick","label":"Volunteer Pick"},{"value":"#Animals","label":"#Animals"},{"value":"#Eco-friendly","label":"#Eco-friendly"},{"value":"#Elderly","label":"#Elderly"},{"value":"#Fabrics","label":"#Fabrics"},{"value":"#FemaleEducation","label":"#FemaleEducation"},{"value":"#FirstLoan","label":"#FirstLoan"},{"value":"#HealthAndSanitation","label":"#HealthAndSanitation"},{"value":"#IncomeProducingDurableAsset","label":"#IncomeProducingDurableAsset"},{"value":"#InspiringStory","label":"#InspiringStory"},{"value":"#InterestingPhoto","label":"#InterestingPhoto"},{"value":"#JobCreator","label":"#JobCreator"},{"value":"#Low-profitFP","label":"#Low-profitFP"},{"value":"#Orphan","label":"#Orphan"},{"value":"#Parent","label":"#Parent"},{"value":"#Refugee","label":"#Refugee"},{"value":"#RepeatBorrower","label":"#RepeatBorrower"},{"value":"#Schooling","label":"#Schooling"},{"value":"#Single","label":"#Single"},{"value":"#SingleParent","label":"#SingleParent"},{"value":"#SupportingFamily","label":"#SupportingFamily"},{"value":"#SustainableAg","label":"#SustainableAg"},{"value":"#Technology","label":"#Technology"},{"value":"#Trees","label":"#Trees"},{"value":"#Unique","label":"#Unique"},{"value":"#Vegan","label":"#Vegan"},{"value":"#Widowed","label":"#Widowed"},{"value":"#WomanOwnedBiz","label":"#WomanOwnedBiz"}]}
        this.options.activity = {ref: 'activity', label: 'Activities', match: 'any', multi: true, select_options: []}
        this.options.themes = {ref: 'themes', label: 'Themes', match: 'all', multi: true, select_options: [{"value":"Green","label":"Green"},{"value":"Higher Education","label":"Higher Education"},{"value":"Arab Youth","label":"Arab Youth"},{"value":"Kiva City LA","label":"Kiva City LA"},{"value":"Islamic Finance","label":"Islamic Finance"},{"value":"Youth","label":"Youth"},{"value":"Start-Up","label":"Start-Up"},{"value":"Water and Sanitation","label":"Water and Sanitation"},{"value":"Vulnerable Groups","label":"Vulnerable Groups"},{"value":"Fair Trade","label":"Fair Trade"},{"value":"Rural Exclusion","label":"Rural Exclusion"},{"value":"Mobile Technology","label":"Mobile Technology"},{"value":"Underfunded Areas","label":"Underfunded Areas"},{"value":"Conflict Zones","label":"Conflict Zones"},{"value":"Job Creation","label":"Job Creation"},{"value":"SME","label":"Small and Medium Enterprises"},{"value":"Growing Businesses","label":"Growing Businesses"},{"value":"Kiva City Detroit","label":"Kiva City Detroit"},{"value":"Health","label":"Health"},{"value":"Disaster recovery","label":"Disaster recovery"},{"value":"Flexible Credit Study","label":"Flexible Credit Study"},{"value":"Innovative Loans","label":"Innovative Loans"}].orderBy(c => c.label)}
        this.options.sort = {ref: 'sort', label: 'Sort', match: '', multi: false, select_options: [{"value": null, label: "Date half is paid back, then 75%, then full (default)"},{value: "final_repayment", label: "Final repayment date"},{value:'newest',label:'Newest'},{value:'expiring',label:'Expiring'},{value:'popularity',label:'Popularity ($/hour)'}]}

        //partner selects
        this.options.social_performance = {ref: 'social_performance', label: 'Social Performance', match: 'all', multi: true, select_options: [{"value":1,"label":"Anti-Poverty Focus"},{"value":3,"label":"Client Voice"},{"value":5,"label":"Entrepreneurial Support"},{"value":6,"label":"Facilitation of Savings"},{"value":4,"label":"Family and Community Empowerment"},{"value":7,"label":"Innovation"},{"value":2,"label":"Vulnerable Group Focus"}]}
        this.options.region = {ref: 'region', label: 'Region', match: 'any', multi: true, select_options: [{"value":"na","label":"North America"},{"value":"ca","label":"Central America"},{"value":"sa","label":"South America"},{"value":"af","label":"Africa"},{"value":"as","label":"Asia"},{"value":"me","label":"Middle East"},{"value":"ee","label":"Eastern Europe"},{"value":"oc","label":"Oceania"},{"value":"we","label":"Western Europe"}]} //{"value":"an","label":"Antarctica"},

        //loan sliders
        this.options.repaid_in = {min: 2, max: 120, label: 'Repaid In (months)'}
        this.options.borrower_count = {min: 1, max: 20, label: 'Borrower Count'}
        this.options.percent_female = {min: 0, max: 100, label: 'Percent Female'}
        this.options.still_needed = {min: 0, max: 1000, step: 25, label: 'Still Needed ($)'} //min: 25? otherwise it bounces back to 25 if set to min
        this.options.expiring_in_days = {min: 0, max: 35, label: 'Expiring In (days)'}

        //partner sliders
        this.options.partner_risk_rating = {min: 0, max: 5, step: 0.5, label: 'Risk Rating (stars)'}
        this.options.partner_arrears = {min: 0, max: 50, label: 'Delinq Rate (%)'}
        this.options.partner_default = {min: 0, max: 30, label: 'Default Rate (%)'}
        this.options.portfolio_yield = {min: 0, max: 100, label: 'Portfolio Yield (%)'}
        this.options.profit = {min: -100, max: 100, label: 'Profit (%)'}
        this.options.loans_at_risk_rate = {min: 0, max: 100, label: 'Loans at Risk (%)'}
        this.options.currency_exchange_loss_rate = {min: 0, max: 20, label: 'Currency Exchange Loss (%)'}
    },
    buildCriteria: function(){
        var criteria = s.criteria.syncBlankCriteria()
        criteria.portfolio = { exclude_portfolio_loans: this.refs.exclude_portfolio_loans.getChecked() }
        criteria = s.criteria.stripNullValues($.extend(true, this.state.criteria, criteria))
        this.state_count++
        this.setState({state_count: this.state_count})
        console.log("######### buildCriteria: criteria", criteria)
        a.criteria.change(criteria)
    },
    criteriaChanged(){
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(this.buildCriteria, 250)
    },
    tabSelect: function(selectedKey){
        if (this.state.activeTab != selectedKey) {
            this.tab_flips++
            this.setState({activeTab: selectedKey, tab_flips: this.tab_flips})
            //todo: tab_flips is a hack. it is used in the key of the sliders to force a re-mounting when flipping tabs
            //otherwise it only renders one knob which is locked in position.
        }
    },
    render: function() {
        var cursor = Cursor.build(this);
        var cLoan = cursor.refine('criteria').refine('loan')
        var cPartner = cursor.refine('criteria').refine('partner')
        var lender_loans_message = kivaloans.lender_loans_message

        return (<div>
            <Tabs animation={false} activeKey={this.state.activeTab} onSelect={this.tabSelect}>
                <If condition={location.hostname == 'localhost!!'}>
                    <pre>{JSON.stringify(this.state, null, 2)}</pre>
                </If>
                <Tab eventKey={1} title="Borrower" className="ample-padding-top">
                    <InputRow label='Use or Description' group={cLoan} name='use' onChange={this.criteriaChanged}/>
                    <InputRow label='Name' group={cLoan} name='name' onChange={this.criteriaChanged}/>

                    <For each='name' index='i' of={['country_code','sector','activity','themes','tags','sort']}>
                        <SelectRow key={i} group={cLoan} name={name} options={this.options[name]} onChange={this.criteriaChanged}/>
                    </For>
                    <For each='name' index='i' of={['repaid_in','borrower_count','percent_female','still_needed','expiring_in_days']}>
                        <SliderRow key={`${this.state.tab_flips}_${i}`} group={cLoan} name={name} options={this.options[name]} onChange={this.criteriaChanged}/>
                    </For>
                </Tab>

                <Tab eventKey={2} title="Partner" className="ample-padding-top">
                    <For each='name' index='i' of={['region','social_performance']}>
                        <SelectRow key={i} group={cPartner} name={name} options={this.options[name]} onChange={this.criteriaChanged}/>
                    </For>
                    <For each='name' index='i' of={['partner_risk_rating','partner_arrears','partner_default','portfolio_yield','profit','loans_at_risk_rate','currency_exchange_loss_rate']}>
                        <SliderRow key={`${this.state.tab_flips}_${i}`} group={cPartner} name={name} options={this.options[name]} onChange={this.criteriaChanged}/>
                    </For>
                </Tab>

                <Tab eventKey={3} title={`Your Portfolio${this.state.portfolioTab}`} className="ample-padding-top">
                    <Row>
                        <Col md={9}>
                            <Input type="checkbox" ref='exclude_portfolio_loans' label={`Hide loans in my portfolio (${lender_loans_message})`} defaultChecked={this.state.criteria.portfolio.exclude_portfolio_loans} onClick={this.criteriaChanged} onChange={this.criteriaChanged} />
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