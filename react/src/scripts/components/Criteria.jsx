import React from 'react';
import Reflux from 'reflux'
import {Grid,Row,Col,Input,Button,Tabs,Tab,DropdownButton,MenuItem,ButtonGroup} from 'react-bootstrap';
import {ChartDistribution,CriteriaTabs} from '.'

const Criteria = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState: function() {
        var showGraphs = (localStorage.criteria_show_graphs) ? JSON.parse(localStorage.criteria_show_graphs) : true
        return {show_graphs: showGraphs}
    },
    toggleGraph(){
        var newShowGraphs = !this.state.show_graphs
        localStorage.criteria_show_graphs = newShowGraphs
        this.setState({ show_graphs: newShowGraphs })
    },
    render: function() {
        console.log("Criteria.render()")
        return (
            <div>
                <h1 style={{marginTop:'0px'}}>Criteria
                    <ButtonGroup className="float_right">
                        <Button className="hidden-xs hidden-sm" onClick={this.toggleGraph}>Graphs</Button>
                        <DropdownButton disabled title='Saved Search' id='saved_search' pullRight>
                            <MenuItem eventKey="1">Coming Soon</MenuItem>
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