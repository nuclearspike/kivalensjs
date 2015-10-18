import React from 'react';
import LinkedStateMixin from 'react-addons-linked-state-mixin'
import Select from 'react-select';
import Reflux from 'reflux'
import a from '../actions'
import s from '../stores/'
import {Grid,Row,Col,Input,Button,Tabs,Tab} from 'react-bootstrap';

var timeoutHandle=0

const CriteriaTabs = React.createClass({
    mixins: [Reflux.ListenerMixin, LinkedStateMixin],
    getInitialState: function () {
        return { criteria: s.criteria.syncGetLast() }
    },
    componentWillMount: function(){
        this.options = {}
    },
    componentDidMount: function () {
        //this.setState(s.criteria.syncGetLast) //todo: can this be criteria.use ?
        this.setKnown()
        this.listenTo(a.partners.load.completed, this.setCountries)
        this.setCountries()
        this.listenTo(a.loans.load.completed, this.setActivities)
        this.setActivities()
    },
    setActivities: function(){
        this.options.activity = kivaloans.loans_from_kiva.select(loan => loan.activity).distinct().orderBy(name => name).select(a => {return {value: a, label: a}})
        this.setState({hasActivities : true})
    },
    setCountries: function(){
        this.options.country_code = s.partners.syncGetCountries().select(c => {return {label: c.name, value: c.iso_code}}).orderBy(c => c.label)
        this.setState({hasCountryCodes : true})
    },
    setKnown: function(){
        this.options.country_code = []
        this.options.sector = [{"value":"Agriculture","label":"Agriculture"},{"value":"Arts","label":"Arts"},{"value":"Clothing","label":"Clothing"},{"value":"Construction","label":"Construction"},{"value":"Education","label":"Education"},{"value":"Entertainment","label":"Entertainment"},{"value":"Food","label":"Food"},{"value":"Health","label":"Health"},{"value":"Housing","label":"Housing"},{"value":"Manufacturing","label":"Manufacturing"},{"value":"Personal Use","label":"Personal Use"},{"value":"Retail","label":"Retail"},{"value":"Services","label":"Services"},{"value":"Transportation","label":"Transportation"},{"value":"Wholesale","label":"Wholesale"}]
        this.options.region = [{"value":"na","label":"North America"},{"value":"ca","label":"Central America"},{"value":"sa","label":"South America"},{"value":"af","label":"Africa"},{"value":"as","label":"Asia"},{"value":"me","label":"Middle East"},{"value":"ee","label":"Eastern Europe"},{"value":"oc","label":"Oceania"},{"value":"an","label":"Antarctica"},{"value":"we","label":"Western Europe"}]
        this.options.tags = [{"value":"user_favorite","label":"User Favorite"},{"value":"volunteer_like","label":"Volunteer Like"},{"value":"volunteer_pick","label":"Volunteer Pick"},{"value":"#Animals","label":"#Animals"},{"value":"#Eco-friendly","label":"#Eco-friendly"},{"value":"#Elderly","label":"#Elderly"},{"value":"#Fabrics","label":"#Fabrics"},{"value":"#FemaleEducation","label":"#FemaleEducation"},{"value":"#FirstLoan","label":"#FirstLoan"},{"value":"#HealthAndSanitation","label":"#HealthAndSanitation"},{"value":"#IncomeProducingDurableAsset","label":"#IncomeProducingDurableAsset"},{"value":"#InspiringStory","label":"#InspiringStory"},{"value":"#InterestingPhoto","label":"#InterestingPhoto"},{"value":"#JobCreator","label":"#JobCreator"},{"value":"#Low-profitFP","label":"#Low-profitFP"},{"value":"#Orphan","label":"#Orphan"},{"value":"#Parent","label":"#Parent"},{"value":"#Refugee","label":"#Refugee"},{"value":"#RepeatBorrower","label":"#RepeatBorrower"},{"value":"#Schooling","label":"#Schooling"},{"value":"#Single","label":"#Single"},{"value":"#SingleParent","label":"#SingleParent"},{"value":"#SupportingFamily","label":"#SupportingFamily"},{"value":"#SustainableAg","label":"#SustainableAg"},{"value":"#Technology","label":"#Technology"},{"value":"#Trees","label":"#Trees"},{"value":"#Unique","label":"#Unique"},{"value":"#Vegan","label":"#Vegan"},{"value":"#Widowed","label":"#Widowed"},{"value":"#WomanOwnedBiz","label":"#WomanOwnedBiz"}]
        this.options.activity = []
        this.options.themes = [{"value":"Green","label":"Green"},{"value":"Higher Education","label":"Higher Education"},{"value":"Arab Youth","label":"Arab Youth"},{"value":"Kiva City LA","label":"Kiva City LA"},{"value":"Islamic Finance","label":"Islamic Finance"},{"value":"Youth","label":"Youth"},{"value":"Start-Up","label":"Start-Up"},{"value":"Water and Sanitation","label":"Water and Sanitation"},{"value":"Vulnerable Groups","label":"Vulnerable Groups"},{"value":"Fair Trade","label":"Fair Trade"},{"value":"Rural Exclusion","label":"Rural Exclusion"},{"value":"Mobile Technology","label":"Mobile Technology"},{"value":"Underfunded Areas","label":"Underfunded Areas"},{"value":"Conflict Zones","label":"Conflict Zones"},{"value":"Job Creation","label":"Job Creation"},{"value":"SME","label":"Small and Medium Enterprises"},{"value":"Growing Businesses","label":"Growing Businesses"},{"value":"Kiva City Detroit","label":"Kiva City Detroit"},{"value":"Health","label":"Health"},{"value":"Disaster recovery","label":"Disaster recovery"},{"value":"Flexible Credit Study","label":"Flexible Credit Study"},{"value":"Innovative Loans","label":"Innovative Loans"}].orderBy(c => c.label)
        this.options.social_performance = [{"value":1,"label":"Anti-Poverty Focus"},{"value":3,"label":"Client Voice"},{"value":5,"label":"Entrepreneurial Support"},{"value":6,"label":"Facilitation of Savings"},{"value":4,"label":"Family and Community Empowerment"},{"value":7,"label":"Innovation"},{"value":2,"label":"Vulnerable Group Focus"}]
        this.options.sort = [{"value": null, label: "Date half is paid back, then 75%, then full (default)"},{value: "final_repayment", label: "Final repayment date"}]
    },
    criteriaChanged: function(){
        clearTimeout(timeoutHandle);
        var getSelVal = (name) => this.refs[name].refs.value.value //todo: this is dumb

        timeoutHandle = setTimeout(()=>{
                var criteria = {loan: {}, partner: {}, portfolio: {}}
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
                console.log("#########: criteria", criteria.loan, criteria.partner, criteria.portfolio)
                a.criteria.change(criteria)
            }, 150)
    },
    blankCriteria(){
        return {loan: {}, partner: {}, portfolio: {}}
    },
    clearCriteria: function(){
        var blank_c = this.blankCriteria()
        this.setState({criteria: blank_c})
        a.criteria.change(blank_c)
    },
    render: function () {
        console.log('render: state:', this.state)
        var selectRow = function (props, group, _this){
            var {ref, match, label, multi} = props
            var c_group = $.extend(true, {}, _this.state.criteria[group], _this.blankCriteria())
            return <Row key={ref}>
                <Col md={2}>
                    <label className="control-label">{label}</label>
                </Col>
                <Col md={6}>
                    <Select multi={multi} value={c_group[ref]} ref={ref} options={_this.options[ref]} clearable={multi} placeholder={(match)? `Match ${match} selected ${label}` : ''} onChange={_this.criteriaChanged} />
                </Col>
            </Row>
        }


        var loanCrit =  [{ref: 'country_code', label: 'Countries', match: 'any', multi: true },
            {ref: 'sector', label: 'Sectors', match: 'any' , multi: true},
            {ref: 'activity', label: 'Activities', match: 'any', multi: true },
            {ref: 'themes', label: 'Themes', match: 'all', multi: true },
            {ref: 'tags', label: 'Tags', match: 'all', multi: true },
            {ref: 'sort', label: 'Sort', match: '', multi: false }
        ]
        var loanCritSelects = loanCrit.map(opt => selectRow(opt, 'loan', this))

        var partCrit = [{ref: 'region', label: 'Region', match: 'any', multi: true},
            {ref: 'social_performance', label: 'Social Performance', match: 'all', multi: true}]
        var partnerCritSelects = partCrit.map(opt => selectRow(opt, 'partner', this))

        return (<div>
            <Tabs defaultActiveKey={1}>
                <Tab eventKey={1} title="Borrower" className="ample-padding-top">
                    <Row>
                        <Input type='text' label='Use or Description' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='use' value={this.state.criteria.loan.use} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Name' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='name' value={this.state.criteria.loan.name} onKeyUp={this.criteriaChanged} />
                    </Row>
                    {loanCritSelects}
                </Tab>

                <Tab eventKey={2} title="Partner" className="ample-padding-top">
                    {partnerCritSelects}
                </Tab>

                <Tab eventKey={3} title="Your Portfolio" className="ample-padding-top">
                    <Row>
                        <Input type='text' disabled label='Kiva Lender ID' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('lender_id')} onKeyUp={this.criteriaChanged} />
                    </Row>
                </Tab>
            </Tabs>
            <Button onClick={this.clearCriteria}>Clear</Button>
            </div>
        );
    }
})
// Always Exclude list of IDs.
export default CriteriaTabs