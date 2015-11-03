import React from 'react';
import Select from 'react-select';
import Slider from 'react-slider' // 'multi-slider' is incompatible with .14 presently
import Reflux from 'reflux'
import a from '../actions'
import s from '../stores/'
import {Grid,Row,Col,Input,Button,Tabs,Tab,Panel} from 'react-bootstrap';
import {Cursor, ImmutableOptimizations} from 'react-cursor'
var Highcharts = require('react-highcharts/dist/bundle/highcharts')

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
            <Input type='text' label={this.props.label} labelClassName='col-md-3' wrapperClassName='col-md-9' ref='input' defaultValue={this.props.group.refine(this.props.name).value} onKeyUp={this.inputChange} />
        </Row>)
    }
})

const SelectRow = React.createClass({
    mixins: [ImmutableOptimizations(['group'])],
    propTypes: {
        options: React.PropTypes.instanceOf(Object).isRequired,
        group: React.PropTypes.instanceOf(Cursor).isRequired,
        name: React.PropTypes.string.isRequired,
        onChange: React.PropTypes.func.isRequired,
        onFocus: React.PropTypes.func
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
            <Col md={3}>
                <label className="control-label">{options.label}</label>
            </Col>
            <Col md={9}>
                <Select multi={options.multi} ref='select' value={this.propertyCursor().value} options={options.select_options} clearable={options.multi} placeholder={(options.match)? `Match ${options.match} selected ${options.label}` : ''} onChange={this.selectChange} onFocus={this.props.onFocus} onBlur={this.props.onBlur} />
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
            //if (this.props.group.refine(`${this.props.name}_min`) )

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
            <Col md={3}>
                <label className="control-label">{options.label}</label>
                <p>{display_min}-{display_max}</p>
            </Col>
            <Col md={9}>
                <Slider ref='slider' className='horizontal-slider' min={options.min} max={options.max} defaultValue={defaults} step={step} withBars onChange={this.sliderChange} />
            </Col>
        </Row>)
    }
})

const CriteriaTabs = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState: function () {
        return { activeTab: 1, state_count: 0, tab_flips: 0, portfolioTab: '', helper_charts: {}, criteria: s.criteria.syncGetLast()}
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
        this.listenTo(a.loans.filter.completed, this.filteredDone)
        if (kivaloans.isReady()) this.loansReady()
        this.criteriaChanged()
    },
    filteredDone(loans){
        //if we are in a selection box and that box is matching all (themes, tags, social perf), then rebuild the graphs
        if (this.last_select && this.last_select.key && this.options[this.last_select.key].match == 'all') {
            this.genHelperGraphs(this.last_select.group, this.last_select.key, loans)
        }
    },
    reloadCriteria(criteria = {}){
        this.setState({criteria: $.extend(true, {}, s.criteria.syncBlankCriteria(), criteria)})
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
        //this.options.activity.select_options = kivaloans.activities.select(a => {return {value: a, label: a}})
        //this.options.country_code.select_options = kivaloans.countries.select(c => {return {label: c.name, value: c.iso_code}})
        this.external_partner_sliders = kivaloans.atheist_list_processed ? ['secular_rating','social_rating'] : []
        this.setState({loansReady : true})
        this.criteriaChanged()
    },
    setKnownOptions: function(){
        //loan selects
        this.options.country_code = {label: 'Countries', match: 'any', multi: true, select_options: [{"label":"Afghanistan","value":"AF"},{"label":"Albania","value":"AL"},{"label":"Armenia","value":"AM"},{"label":"Azerbaijan","value":"AZ"},{"label":"Belize","value":"BZ"},{"label":"Benin","value":"BJ"},{"label":"Bolivia","value":"BO"},{"label":"Bosnia and Herzegovina","value":"BA"},{"label":"Brazil","value":"BR"},{"label":"Bulgaria","value":"BG"},{"label":"Burkina Faso","value":"BF"},{"label":"Burundi","value":"BI"},{"label":"Cambodia","value":"KH"},{"label":"Cameroon","value":"CM"},{"label":"Chad","value":"TD"},{"label":"Chile","value":"CL"},{"label":"China","value":"CN"},{"label":"Colombia","value":"CO"},{"label":"Congo","value":"CG"},{"label":"Costa Rica","value":"CR"},{"label":"Cote D'Ivoire","value":"CI"},{"label":"Dominican Republic","value":"DO"},{"label":"Ecuador","value":"EC"},{"label":"Egypt","value":"EG"},{"label":"El Salvador","value":"SV"},{"label":"Gaza","value":"GZ"},{"label":"Georgia","value":"GE"},{"label":"Ghana","value":"GH"},{"label":"Guatemala","value":"GT"},{"label":"Haiti","value":"HT"},{"label":"Honduras","value":"HN"},{"label":"India","value":"IN"},{"label":"Indonesia","value":"ID"},{"label":"Iraq","value":"IQ"},{"label":"Israel","value":"IL"},{"label":"Jordan","value":"JO"},{"label":"Kenya","value":"KE"},{"label":"Kosovo","value":"XK"},{"label":"Kyrgyzstan","value":"KG"},{"label":"Lao People's Democratic Republic","value":"LA"},{"label":"Lebanon","value":"LB"},{"label":"Lesotho","value":"LS"},{"label":"Liberia","value":"LR"},{"label":"Madagascar","value":"MG"},{"label":"Malawi","value":"MW"},{"label":"Mali","value":"ML"},{"label":"Mauritania","value":"MR"},{"label":"Mexico","value":"MX"},{"label":"Moldova","value":"MD"},{"label":"Mongolia","value":"MN"},{"label":"Mozambique","value":"MZ"},{"label":"Myanmar (Burma)","value":"MM"},{"label":"Namibia","value":"NA"},{"label":"Nepal","value":"NP"},{"label":"Nicaragua","value":"NI"},{"label":"Nigeria","value":"NG"},{"label":"Pakistan","value":"PK"},{"label":"Palestine","value":"PS"},{"label":"Panama","value":"PA"},{"label":"Papua New Guinea","value":"PG"},{"label":"Paraguay","value":"PY"},{"label":"Peru","value":"PE"},{"label":"Philippines","value":"PH"},{"label":"Rwanda","value":"RW"},{"label":"Saint Vincent and the Grenadines","value":"VC"},{"label":"Samoa","value":"WS"},{"label":"Senegal","value":"SN"},{"label":"Sierra Leone","value":"SL"},{"label":"Solomon Islands","value":"SB"},{"label":"Somalia","value":"SO"},{"label":"South Africa","value":"ZA"},{"label":"South Sudan","value":"QS"},{"label":"Sri Lanka","value":"LK"},{"label":"Suriname","value":"SR"},{"label":"Tajikistan","value":"TJ"},{"label":"Tanzania","value":"TZ"},{"label":"Thailand","value":"TH"},{"label":"The Democratic Republic of the Congo","value":"CD"},{"label":"Timor-Leste","value":"TL"},{"label":"Togo","value":"TG"},{"label":"Turkey","value":"TR"},{"label":"Uganda","value":"UG"},{"label":"Ukraine","value":"UA"},{"label":"United States","value":"US"},{"label":"Vanuatu","value":"VU"},{"label":"Vietnam","value":"VN"},{"label":"Yemen","value":"YE"},{"label":"Zambia","value":"ZM"},{"label":"Zimbabwe","value":"ZW"}]}
        this.options.sector = {label: 'Sectors', match: 'any' , multi: true, select_options: [{"value":"Agriculture","label":"Agriculture"},{"value":"Arts","label":"Arts"},{"value":"Clothing","label":"Clothing"},{"value":"Construction","label":"Construction"},{"value":"Education","label":"Education"},{"value":"Entertainment","label":"Entertainment"},{"value":"Food","label":"Food"},{"value":"Health","label":"Health"},{"value":"Housing","label":"Housing"},{"value":"Manufacturing","label":"Manufacturing"},{"value":"Personal Use","label":"Personal Use"},{"value":"Retail","label":"Retail"},{"value":"Services","label":"Services"},{"value":"Transportation","label":"Transportation"},{"value":"Wholesale","label":"Wholesale"}]}
        this.options.activity = {label: 'Activities', match: 'any', multi: true, select_options: [{"label":"Agriculture","value":"Agriculture"},{"label":"Air Conditioning","value":"Air Conditioning"},{"label":"Animal Sales","value":"Animal Sales"},{"label":"Arts","value":"Arts"},{"label":"Auto Repair","value":"Auto Repair"},{"label":"Bakery","value":"Bakery"},{"label":"Balut-Making","value":"Balut-Making"},{"label":"Barber Shop","value":"Barber Shop"},{"label":"Beauty Salon","value":"Beauty Salon"},{"label":"Bicycle Repair","value":"Bicycle Repair"},{"label":"Bicycle Sales","value":"Bicycle Sales"},{"label":"Blacksmith","value":"Blacksmith"},{"label":"Bookbinding","value":"Bookbinding"},{"label":"Bookstore","value":"Bookstore"},{"label":"Bricks","value":"Bricks"},{"label":"Butcher Shop","value":"Butcher Shop"},{"label":"Cafe","value":"Cafe"},{"label":"Call Center","value":"Call Center"},{"label":"Carpentry","value":"Carpentry"},{"label":"Catering","value":"Catering"},{"label":"Cattle","value":"Cattle"},{"label":"Cement","value":"Cement"},{"label":"Cereals","value":"Cereals"},{"label":"Charcoal Sales","value":"Charcoal Sales"},{"label":"Cheese Making","value":"Cheese Making"},{"label":"Child Care","value":"Child Care"},{"label":"Cloth & Dressmaking Supplies","value":"Cloth & Dressmaking Supplies"},{"label":"Clothing","value":"Clothing"},{"label":"Clothing Sales","value":"Clothing Sales"},{"label":"Cobbler","value":"Cobbler"},{"label":"Computers","value":"Computers"},{"label":"Construction","value":"Construction"},{"label":"Construction Supplies","value":"Construction Supplies"},{"label":"Consumer Goods","value":"Consumer Goods"},{"label":"Cosmetics Sales","value":"Cosmetics Sales"},{"label":"Crafts","value":"Crafts"},{"label":"Dairy","value":"Dairy"},{"label":"Decorations Sales","value":"Decorations Sales"},{"label":"Dental","value":"Dental"},{"label":"Education provider","value":"Education provider"},{"label":"Electrical Goods","value":"Electrical Goods"},{"label":"Electrician","value":"Electrician"},{"label":"Electronics Repair","value":"Electronics Repair"},{"label":"Electronics Sales","value":"Electronics Sales"},{"label":"Embroidery","value":"Embroidery"},{"label":"Entertainment","value":"Entertainment"},{"label":"Farm Supplies","value":"Farm Supplies"},{"label":"Farming","value":"Farming"},{"label":"Film","value":"Film"},{"label":"Fish Selling","value":"Fish Selling"},{"label":"Fishing","value":"Fishing"},{"label":"Flowers","value":"Flowers"},{"label":"Food","value":"Food"},{"label":"Food Market","value":"Food Market"},{"label":"Food Production/Sales","value":"Food Production/Sales"},{"label":"Food Stall","value":"Food Stall"},{"label":"Fruits & Vegetables","value":"Fruits & Vegetables"},{"label":"Fuel/Firewood","value":"Fuel/Firewood"},{"label":"Funeral Expenses","value":"Funeral Expenses"},{"label":"Furniture Making","value":"Furniture Making"},{"label":"Games","value":"Games"},{"label":"General Store","value":"General Store"},{"label":"Goods Distribution","value":"Goods Distribution"},{"label":"Grocery Store","value":"Grocery Store"},{"label":"Hardware","value":"Hardware"},{"label":"Health","value":"Health"},{"label":"Higher education costs","value":"Higher education costs"},{"label":"Home Appliances","value":"Home Appliances"},{"label":"Home Energy","value":"Home Energy"},{"label":"Home Products Sales","value":"Home Products Sales"},{"label":"Hotel","value":"Hotel"},{"label":"Internet Cafe","value":"Internet Cafe"},{"label":"Jewelry","value":"Jewelry"},{"label":"Knitting","value":"Knitting"},{"label":"Land Rental","value":"Land Rental"},{"label":"Laundry","value":"Laundry"},{"label":"Liquor Store / Off-License","value":"Liquor Store / Off-License"},{"label":"Livestock","value":"Livestock"},{"label":"Machine Shop","value":"Machine Shop"},{"label":"Machinery Rental","value":"Machinery Rental"},{"label":"Manufacturing","value":"Manufacturing"},{"label":"Medical Clinic","value":"Medical Clinic"},{"label":"Metal Shop","value":"Metal Shop"},{"label":"Milk Sales","value":"Milk Sales"},{"label":"Mobile Phones","value":"Mobile Phones"},{"label":"Motorcycle Repair","value":"Motorcycle Repair"},{"label":"Motorcycle Transport","value":"Motorcycle Transport"},{"label":"Movie Tapes & DVDs","value":"Movie Tapes & DVDs"},{"label":"Music Discs & Tapes","value":"Music Discs & Tapes"},{"label":"Musical Instruments","value":"Musical Instruments"},{"label":"Musical Performance","value":"Musical Performance"},{"label":"Natural Medicines","value":"Natural Medicines"},{"label":"Office Supplies","value":"Office Supplies"},{"label":"Paper Sales","value":"Paper Sales"},{"label":"Party Supplies","value":"Party Supplies"},{"label":"Patchwork","value":"Patchwork"},{"label":"Perfumes","value":"Perfumes"},{"label":"Personal Housing Expenses","value":"Personal Housing Expenses"},{"label":"Personal Medical Expenses","value":"Personal Medical Expenses"},{"label":"Personal Products Sales","value":"Personal Products Sales"},{"label":"Personal Purchases","value":"Personal Purchases"},{"label":"Pharmacy","value":"Pharmacy"},{"label":"Phone Accessories","value":"Phone Accessories"},{"label":"Phone Repair","value":"Phone Repair"},{"label":"Phone Use Sales","value":"Phone Use Sales"},{"label":"Photography","value":"Photography"},{"label":"Pigs","value":"Pigs"},{"label":"Plastics Sales","value":"Plastics Sales"},{"label":"Poultry","value":"Poultry"},{"label":"Primary/secondary school costs","value":"Primary/secondary school costs"},{"label":"Printing","value":"Printing"},{"label":"Property","value":"Property"},{"label":"Pub","value":"Pub"},{"label":"Quarrying","value":"Quarrying"},{"label":"Recycled Materials","value":"Recycled Materials"},{"label":"Recycling","value":"Recycling"},{"label":"Religious Articles","value":"Religious Articles"},{"label":"Renewable Energy Products","value":"Renewable Energy Products"},{"label":"Restaurant","value":"Restaurant"},{"label":"Retail","value":"Retail"},{"label":"Rickshaw","value":"Rickshaw"},{"label":"Secretarial Services","value":"Secretarial Services"},{"label":"Services","value":"Services"},{"label":"Sewing","value":"Sewing"},{"label":"Shoe Sales","value":"Shoe Sales"},{"label":"Soft Drinks","value":"Soft Drinks"},{"label":"Souvenir Sales","value":"Souvenir Sales"},{"label":"Spare Parts","value":"Spare Parts"},{"label":"Sporting Good Sales","value":"Sporting Good Sales"},{"label":"Tailoring","value":"Tailoring"},{"label":"Taxi","value":"Taxi"},{"label":"Textiles","value":"Textiles"},{"label":"Timber Sales","value":"Timber Sales"},{"label":"Tourism","value":"Tourism"},{"label":"Transportation","value":"Transportation"},{"label":"Traveling Sales","value":"Traveling Sales"},{"label":"Upholstery","value":"Upholstery"},{"label":"Used Clothing","value":"Used Clothing"},{"label":"Used Shoes","value":"Used Shoes"},{"label":"Utilities","value":"Utilities"},{"label":"Vehicle","value":"Vehicle"},{"label":"Vehicle Repairs","value":"Vehicle Repairs"},{"label":"Veterinary Sales","value":"Veterinary Sales"},{"label":"Waste Management","value":"Waste Management"},{"label":"Water Distribution","value":"Water Distribution"},{"label":"Weaving","value":"Weaving"},{"label":"Wedding Expenses","value":"Wedding Expenses"},{"label":"Well digging","value":"Well digging"},{"label":"Wholesale","value":"Wholesale"}]}
        this.options.tags = {label: 'Tags', match: 'all', multi: true, select_options: [{"value":"user_favorite","label":"User Favorite"},{"value":"volunteer_like","label":"Volunteer Like"},{"value":"volunteer_pick","label":"Volunteer Pick"},{"value":"#Animals","label":"#Animals"},{"value":"#Eco-friendly","label":"#Eco-friendly"},{"value":"#Elderly","label":"#Elderly"},{"value":"#Fabrics","label":"#Fabrics"},{"value":"#FemaleEducation","label":"#FemaleEducation"},{"value":"#FirstLoan","label":"#FirstLoan"},{"value":"#HealthAndSanitation","label":"#HealthAndSanitation"},{"value":"#IncomeProducingDurableAsset","label":"#IncomeProducingDurableAsset"},{"value":"#InspiringStory","label":"#InspiringStory"},{"value":"#InterestingPhoto","label":"#InterestingPhoto"},{"value":"#JobCreator","label":"#JobCreator"},{"value":"#Low-profitFP","label":"#Low-profitFP"},{"value":"#Orphan","label":"#Orphan"},{"value":"#Parent","label":"#Parent"},{"value":"#Refugee","label":"#Refugee"},{"value":"#RepeatBorrower","label":"#RepeatBorrower"},{"value":"#Schooling","label":"#Schooling"},{"value":"#Single","label":"#Single"},{"value":"#SingleParent","label":"#SingleParent"},{"value":"#SupportingFamily","label":"#SupportingFamily"},{"value":"#SustainableAg","label":"#SustainableAg"},{"value":"#Technology","label":"#Technology"},{"value":"#Trees","label":"#Trees"},{"value":"#Unique","label":"#Unique"},{"value":"#Vegan","label":"#Vegan"},{"value":"#Widowed","label":"#Widowed"},{"value":"#WomanOwnedBiz","label":"#WomanOwnedBiz"}]}
        this.options.themes = {label: 'Themes', match: 'all', multi: true, select_options: [{"value":"Green","label":"Green"},{"value":"Higher Education","label":"Higher Education"},{"value":"Arab Youth","label":"Arab Youth"},{"value":"Kiva City LA","label":"Kiva City LA"},{"value":"Islamic Finance","label":"Islamic Finance"},{"value":"Youth","label":"Youth"},{"value":"Start-Up","label":"Start-Up"},{"value":"Water and Sanitation","label":"Water and Sanitation"},{"value":"Vulnerable Groups","label":"Vulnerable Groups"},{"value":"Fair Trade","label":"Fair Trade"},{"value":"Rural Exclusion","label":"Rural Exclusion"},{"value":"Mobile Technology","label":"Mobile Technology"},{"value":"Underfunded Areas","label":"Underfunded Areas"},{"value":"Conflict Zones","label":"Conflict Zones"},{"value":"Job Creation","label":"Job Creation"},{"value":"SME","label":"Small and Medium Enterprises"},{"value":"Growing Businesses","label":"Growing Businesses"},{"value":"Kiva City Detroit","label":"Kiva City Detroit"},{"value":"Health","label":"Health"},{"value":"Disaster recovery","label":"Disaster recovery"},{"value":"Flexible Credit Study","label":"Flexible Credit Study"},{"value":"Innovative Loans","label":"Innovative Loans"}].orderBy(c => c.label)}
        this.options.sort = {label: 'Sort', match: '', multi: false, select_options: [{"value": null, label: "Date half is paid back, then 75%, then full (default)"},{value: "final_repayment", label: "Final repayment date"},{value:'newest',label:'Newest'},{value:'expiring',label:'Expiring'},{value:'popularity',label:'Popularity ($/hour)'}]}

        //partner selects
        this.options.social_performance = {ref: 'social_performance', label: 'Social Performance', match: 'all', multi: true, select_options: [{"value":1,"label":"Anti-Poverty Focus"},{"value":3,"label":"Client Voice"},{"value":5,"label":"Entrepreneurial Support"},{"value":6,"label":"Facilitation of Savings"},{"value":4,"label":"Family and Community Empowerment"},{"value":7,"label":"Innovation"},{"value":2,"label":"Vulnerable Group Focus"}]}
        this.options.region = {ref: 'region', label: 'Region', match: 'any', multi: true, select_options: [{"value":"na","label":"North America"},{"value":"ca","label":"Central America"},{"value":"sa","label":"South America"},{"value":"af","label":"Africa"},{"value":"as","label":"Asia"},{"value":"me","label":"Middle East"},{"value":"ee","label":"Eastern Europe"},{"value":"oc","label":"Oceania"},{"value":"we","label":"Western Europe"}]} //{"value":"an","label":"Antarctica"},

        //loan sliders
        this.options.repaid_in = {min: 2, max: 120, label: 'Repaid In (months)'}
        this.options.borrower_count = {min: 1, max: 20, label: 'Borrower Count'}
        this.options.percent_female = {min: 0, max: 100, label: 'Percent Female'}
        this.options.still_needed = {min: 0, max: 1000, step: 25, label: 'Still Needed ($)'} //min: 25? otherwise it bounces back to 25 if set to min
        this.options.expiring_in_days = {min: 0, max: 35, label: 'Expiring In (days)'}
        this.options.disbursal_in_days = {min: -90, max: 90, label: 'Disbursal (days)'}

        //partner sliders
        this.options.partner_risk_rating = {min: 0, max: 5, step: 0.5, label: 'Risk Rating (stars)'}
        this.options.partner_arrears = {min: 0, max: 50, label: 'Delinq Rate (%)'}
        this.options.partner_default = {min: 0, max: 30, label: 'Default Rate (%)'}
        this.options.portfolio_yield = {min: 0, max: 100, label: 'Portfolio Yield (%)'}
        this.options.profit = {min: -100, max: 100, label: 'Profit (%)'}
        this.options.loans_at_risk_rate = {min: 0, max: 100, label: 'Loans at Risk (%)'}
        this.options.currency_exchange_loss_rate = {min: 0, max: 10, label: 'Currency Exchange Loss (%)'}
        this.options.average_loan_size_percent_per_capita_income = {min: 0, max: 300, label: 'Average Loan/Capita Income'}
        this.options.secular_rating = {min: 1, max: 4, label: 'Secular Score (Atheist List)'}
        this.options.social_rating = {min: 1, max: 4, label: 'Social Score (Atheist List)'}
        this.external_partner_sliders = []
    },
    criteriaChanged(){
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(this.performSearch, 50)
    },
    performSearch(){
        var criteria = this.buildCriteria()
        this.state_count++
        this.setState({state_count: this.state_count})
        console.log("######### buildCriteria: criteria", criteria)
        a.criteria.change(criteria)
    },
    buildCriteria: function(){
        var criteria = s.criteria.syncBlankCriteria()
        //the only one right now that needs to be manually pulled.
        criteria.portfolio = { exclude_portfolio_loans: this.refs.exclude_portfolio_loans.getChecked() }
        criteria = s.criteria.stripNullValues($.extend(true, criteria, this.state.criteria))
        return criteria
    },
    buildCriteriaWithout(group, key){
        var crit = this.buildCriteria()
        delete crit[group][key]
        return crit
    },
    performSearchWithout(group, key){
        return s.loans.syncFilterLoans(this.buildCriteriaWithout(group, key))
    },
    tabSelect: function(selectedKey){
        if (this.state.activeTab != selectedKey) {
            this.tab_flips++
            this.setState({activeTab: selectedKey, tab_flips: this.tab_flips})
            //todo: tab_flips is a hack. it is used in the key of the sliders to force a re-mounting when flipping tabs
            //otherwise it only renders one knob which is locked in position.
        }
    },
    genHelperGraphs(group, key, loans){
        var data
        switch (key){
            case 'country_code':
                data = loans.groupBy(l=>l.location.country).map(g=>{return {name: g[0].location.country, count: g.length}})
                break
            case 'sector':
                data = loans.groupBy(l=>l.sector).map(g=>{ return {name: g[0].sector, count: g.length}})
                break
            case 'activity':
                data = loans.groupBy(l=>l.activity).map(g=>{return {name: g[0].activity, count: g.length}})
                break
            case 'tags':
                data = [].concat.apply([], loans.select(l => l.kl_tags)).groupBy(t => t).map(g=>{return {name: g[0], count: g.length}})
                break
            case 'themes':
                data = [].concat.apply([], loans.select(l => l.themes)).where(t => t != undefined).groupBy(t => t).map(g=>{return {name: g[0], count: g.length}})
                break

            case 'social_performance':
                data = [].concat.apply([], loans.select(l => kivaloans.getPartner(l.partner_id).social_performance_strengths)).where(sp => sp != undefined).select(sp => sp.name).groupBy(t => t).map(g=>{return {name: g[0], count: g.length}})
                break
            case 'region':
                data = [].concat.apply([], loans.select(l => kivaloans.getPartner(l.partner_id).countries)).select(c => c.region).groupBy(t => t).map(g=>{return {name: g[0], count: g.length}})
                break
            default:
                return
        }

        var basicReverseOrder = (a,b) => { //this is a hack. OrderBy has issues! Not sure what the conditions are.
            if (a > b) return -1
            if (a < b) return 1
            return 0
        }

        data = data.orderBy(d => d.count, basicReverseOrder)

        //console.log('focusSelect', data)
        var config = {
            chart: {type: 'bar',
                animation: false ,
                renderTo: 'loan_options_graph'
            },
            title: {text: this.options[key].label},
            xAxis: {
                categories: data.select(d => d.name),
                title: {text: null}
            },
            yAxis: {
                min: 0,
                dataLabels: {enabled: false},
                labels: {overflow: 'justify'}
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        format: '{y:.0f}'
                    }
                }
            },
            legend: {enabled: false},
            credits: {enabled: false},
            series: [{
                animation: false,
                name: 'Loans',
                data: data.select(d => d.count)
            }]
        }
        //console.log(config)
        var newState = {helper_charts: {}}
        newState.helper_charts[group] = config
        this.setState(newState)
    },
    focusSelect(group, key){
        if ('lg' != findBootstrapEnv()) return //if we're not on a desktop

        this.last_select = {group: group, key: key}
        console.log('focusSelect', group, key)

        var loans = (this.options[key].match == 'any') ? this.performSearchWithout(group, key) : s.loans.syncFilterLoansLast()
        this.genHelperGraphs(group,key,loans)
    },
    removeGraphs(){
        this.last_select = {}
        this.setState({helper_charts: {}})
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
                    <Col lg={8}>
                        <InputRow label='Use or Description' group={cLoan} name='use' onChange={this.criteriaChanged}/>
                        <InputRow label='Name' group={cLoan} name='name' onChange={this.criteriaChanged}/>

                        <For each='name' index='i' of={['country_code','sector','activity','themes','tags','sort']}>
                            <SelectRow key={i} group={cLoan} name={name} options={this.options[name]} onChange={this.criteriaChanged} onFocus={this.focusSelect.bind(this, 'loan', name)} onBlur={this.removeGraphs}/>
                        </For>
                        <For each='name' index='i' of={['repaid_in','borrower_count','percent_female','still_needed','expiring_in_days', 'disbursal_in_days']}>
                            <SliderRow key={`${this.state.tab_flips}_${i}`} group={cLoan} name={name} options={this.options[name]} onChange={this.criteriaChanged}/>
                        </For>
                    </Col>

                    <Col lg={4} className='visible-lg-block' id='loan_options_graph'>
                        <If condition={this.state.helper_charts.loan}>
                            <Highcharts style={{height: '800px'}} config={this.state.helper_charts.loan}/>
                        </If>
                    </Col>
                </Tab>



                <Tab eventKey={2} title="Partner" className="ample-padding-top">
                    <Col lg={8}>
                        <For each='name' index='i' of={['region','social_performance']}>
                            <SelectRow key={i} group={cPartner} name={name} options={this.options[name]} onChange={this.criteriaChanged} onFocus={this.focusSelect.bind(this, 'partner', name)} onBlur={this.removeGraphs}/>
                        </For>
                        <For each='name' index='i' of={['partner_risk_rating','partner_arrears','partner_default','portfolio_yield','profit','loans_at_risk_rate','currency_exchange_loss_rate', 'average_loan_size_percent_per_capita_income']}>
                            <SliderRow key={`${this.state.tab_flips}_${i}`} group={cPartner} name={name} options={this.options[name]} onChange={this.criteriaChanged}/>
                        </For>
                        <For each='name' index='i' of={this.external_partner_sliders}>
                            <SliderRow key={`${this.state.tab_flips}_${i}_atheist`} group={cPartner} name={name} options={this.options[name]} onChange={this.criteriaChanged}/>
                        </For>
                    </Col>

                    <Col lg={4} className='visible-lg-block' id='loan_options_graph'>
                        <If condition={this.state.helper_charts.partner}>
                            <Highcharts style={{height: '600px'}} config={this.state.helper_charts.partner} />
                        </If>
                    </Col>
                </Tab>



                <Tab eventKey={3} title={`Your Portfolio${this.state.portfolioTab}`} className="ample-padding-top">
                    <Row>
                        <Col md={9}>
                            <Input type="checkbox" ref='exclude_portfolio_loans' label={`Hide loans in my portfolio (${lender_loans_message})`} defaultChecked={this.state.criteria.portfolio.exclude_portfolio_loans} onClick={this.criteriaChanged} onChange={this.criteriaChanged} />
                            <Panel header='Portfolio Balancing'>
                                Coming Soon!
                            </Panel>
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