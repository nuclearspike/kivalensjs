'use strict';
import React from 'react'
import {KivaImage} from '.'

class Details extends React.Component {
    render() {
        return (
            <div>
                Details
                <KivaImage loan={this.state.loan} type="width" image_width={800}/>
            </div>
        );
    }
}

export default Details;