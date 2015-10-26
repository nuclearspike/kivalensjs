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
            var new_state = {show: !kivaloans.hasLoans()}
            if (progress.done) new_state[`${progress.task}_progress`]  = (progress.done * 100) / progress.total * (progress.task == 'ids'? .33 : .67)
            if (progress.label) new_state.progress_label = progress.label
            if (progress.complete) new_state.show = false
            this.setState(new_state)
        })
        this.listenTo(a.loans.load.completed, ()=>{this.setState({show: false})})
        this.listenTo(a.loans.load.failed, (status)=>{
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
                        <ProgressBar>
                            <ProgressBar bsStyle="info" active={this.state.ids_progress < 32} label={this.state.ids_progress > 10 ? 'basics': ''} now={this.state.ids_progress} />
                            <ProgressBar active label={this.state.details_progress > 10 ? 'details': ''} now={this.state.details_progress} />
                        </ProgressBar>
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