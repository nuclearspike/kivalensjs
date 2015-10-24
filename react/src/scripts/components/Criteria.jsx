import React from 'react';
import Reflux from 'reflux'
import {Grid,Row,Col,Input,Button,Tabs,Tab,DropdownButton,MenuItem,ButtonGroup} from 'react-bootstrap';
import {ChartDistribution,CriteriaTabs} from '.'

const Criteria = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState: function() {
        return {show_graphs: true}
    },
    render: function() {
        console.log("Criteria.render()")
        return (
            <div>
                <h1>Criteria
                    <ButtonGroup className="float_right">
                        <Button className="hidden-xs hidden-sm" onClick={ ()=> this.setState({ show_graphs: !this.state.show_graphs })}>Graphs</Button>
                        <DropdownButton title='Saved Search' id='saved_search' pullRight>
                            <MenuItem eventKey="1">Coming Soon</MenuItem>
                        </DropdownButton>
                    </ButtonGroup>
                </h1>
                <ChartDistribution open={this.state.show_graphs}/>
                <CriteriaTabs/>
            </div>
        );
    }
})

export default Criteria