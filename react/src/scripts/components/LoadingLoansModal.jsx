import React from 'react'
import Reflux from 'reflux'
import {Modal,ProgressBar} from 'react-bootstrap'
import a from '../actions'

var LoadingLoansModal = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState:function(){
        return {progress_label: 'Please Wait', progress: 0, show: this.props.show, error_message: ''}
    },
    componentDidMount: function() {
        window.rga.modalview('/loading');
        this.listenTo(a.loans.load.progressed, progress => {
            var new_state = {show: true}
            if (progress.percentage) new_state.progress = progress.percentage
            if (progress.label) new_state.progress_label = progress.label
            this.setState(new_state)
        })
        this.listenTo(a.loans.load.completed, ()=>{this.setState({show: false})})
        this.listenTo(a.loans.load.failed, (status)=>{
            console.log("FAILED", status)
            this.setState({progress_label: 'Download Failed! Error Message from Kiva:', error_message: status })
        })
    },
    render() {
        return (
            <div className="static-modal">
                <Modal show={this.state.show} onHide={()=>{}}>
                    <Modal.Header>
                        <Modal.Title>Loading Fundraising Loans from Kiva.org</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <ProgressBar active now={this.state.progress} />
                        <p>To greatly reduce load time, check out the "Options"
                            tab to always exclude certain types of loans from the initial load.</p>
                    </Modal.Body>

                    <Modal.Footer>
                        {this.state.progress_label}<br/>
                        {this.state.error_message}
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
})

export default LoadingLoansModal