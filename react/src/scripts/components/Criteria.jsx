import React from 'react/addons';
import Reflux from 'reflux'
import {Grid,Row,Col,Input,Button,Tabs,Tab} from 'react-bootstrap';
import {ChartDistribution,CriteriaTabs} from '.'

const Criteria = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState: function() {
        console.log("Criteria.getInitialState()")
        return {show_graphs: true}
    },
    componentDidMount: function() {
        console.log("Criteria.componentDidMount()")
    },
    render: function() {
        console.log("Criteria.render()")
        return (
            <div>
                <h1>Criteria <Button onClick={ ()=> this.setState({ show_graphs: !this.state.show_graphs })}>Graphs</Button></h1>
                <ChartDistribution open={this.state.show_graphs}/>
                <CriteriaTabs/>
            </div>
        );
    }
})

export default Criteria