'use strict';

class Loan extends React.Component {
    render() {
        return (
            <div>
            {this.props.params.id}
            </div>
        );
    }
}


module.exports = Loan;