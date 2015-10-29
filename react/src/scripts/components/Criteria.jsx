import React from 'react'
import Reflux from 'reflux'
import {Grid,Row,Col,Input,Button,Tabs,Tab,DropdownButton,MenuItem,ButtonGroup} from 'react-bootstrap'
import LocalStorageMixin from 'react-localstorage'
import {ChartDistribution,CriteriaTabs} from '.'
import a from '../actions'
import s from '../stores/'

const Criteria = React.createClass({
    mixins: [Reflux.ListenerMixin, LocalStorageMixin],
    getInitialState() { return {show_graphs: true, saved_searches: s.criteria.syncGetAllNames()} },
    getStateFilterKeys() { return ['show_graphs']},
    componentDidMount(){
        this.listenTo(a.criteria.savedSearchListChanged, this._savedSearchListChanged )
        this._savedSearchListChanged()
    },
    _savedSearchListChanged(){
        var newState = {}
        newState.saved_searches = s.criteria.syncGetAllNames()
        newState.lastSaved = s.criteria.syncGetLastSwitch()
        this.setState(newState)
        a.loans.filter() //todo: temp??? graphs disappearing.
    },
    promptForName(){
        console.log("promptForName()")
        var options = {title: "Enter Name for Search Criteria", label: 'Name', callback: s.criteria.syncSaveLastByName}
        a.utils.prompt(options)
        //var new_name = prompt('Enter Name for Search Criteria')
        //if (new_name) s.criteria.syncSaveLastByName(new_name)
    },
    toggleGraph(){ this.setState({ show_graphs: !this.state.show_graphs }) },
    render() {
        return (
            <div>
                <h1 style={{marginTop:'0px'}}>Criteria
                    <ButtonGroup className="float_right">
                        <Button className="hidden-xs hidden-sm" onClick={this.toggleGraph}>Graphs</Button>
                        <DropdownButton title='Saved Search' id='saved_search' pullRight>
                            <If condition={this.state.lastSaved}>
                                <MenuItem eventKey={4000} key='start_fresh' onClick={a.criteria.startFresh}>Create New</MenuItem>
                            </If>
                            <If condition={this.state.lastSaved}>
                                <MenuItem divider />
                            </If>
                            <For each='saved' index='i' of={this.state.saved_searches}>
                                <MenuItem eventKey={i} key={i} onClick={a.criteria.switchToSaved.bind(this, saved)}>{saved}</MenuItem>
                            </For>
                            <If condition={this.state.saved_searches.length > 0}>
                                <MenuItem divider />
                            </If>
                            <If condition={this.state.lastSaved}>
                                <MenuItem eventKey={1000} key='save_current' onClick={s.criteria.syncSaveLastByName.bind(this, this.state.lastSaved)}>Save Current Criteria as '{this.state.lastSaved}'</MenuItem>
                            </If>
                            <If condition={this.state.lastSaved}>
                                <MenuItem eventKey={3000} key='delete_saved' onClick={s.criteria.syncDelete.bind(this, this.state.lastSaved)}>Delete '{this.state.lastSaved}'</MenuItem>
                            </If>
                            <If condition={this.state.lastSaved}>
                                <MenuItem divider />
                            </If>
                            <MenuItem eventKey={2000} key='save_current_as' onClick={this.promptForName}>Save Current Criteria As...</MenuItem>
                        </DropdownButton>
                    </ButtonGroup>
                </h1>
                <If condition={this.state.show_graphs}>
                    <ChartDistribution/>
                </If>
                <CriteriaTabs/>
            </div>
        );
    }
})

export default Criteria