'use strict';
import React from 'react'
import {KivaImage} from '.'

class Loan extends React.Component {
    render() {
        return (
            <div>
                {this.props.params.id}

            </div>
        );
    }
}
//<KivaImage loan={this.state.loan} image_width={800}/>

module.exports = Loan;