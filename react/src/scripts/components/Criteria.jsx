import React from 'react';
import Reflux from 'reflux'
import {Grid,Row,Col,Input,Button,Tabs,Tab,DropdownButton,MenuItem,ButtonGroup} from 'react-bootstrap';
import LocalStorageMixin from 'react-localstorage'
import {ChartDistribution,CriteriaTabs} from '.'

const Criteria = React.createClass({
    mixins: [Reflux.ListenerMixin, LocalStorageMixin],
    getInitialState: function() { return {show_graphs: true} },
    toggleGraph(){
        this.setState({ show_graphs: !this.state.show_graphs })
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