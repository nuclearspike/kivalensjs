'use strict';

//PAGES
import Search from './Search.jsx';
import Details from './Details.jsx';
import Loan from './Loan.jsx';
import NotFound from './NotFound.jsx';
import Schedule from './Schedule.jsx';
import About from './About.jsx';
import Basket from './Basket.jsx';
import Options from './Options.jsx';

//COMPONENTS
import KLNav from './KLNav.jsx';
import KLFooter from './KLFooter.jsx';
//import LoanListContainer from './LoanListContainer.jsx';
import LoanListItem from './LoanListItem.jsx';
import LoadingLoansModal from './LoadingLoansModal.jsx'

//when mistakenly importing without {}'s around variable name. prevents obscure errors.
import CatchNoCurlies from './CatchNoCurlies.jsx';

export default CatchNoCurlies;

export {Search, Details, Loan, NotFound, Schedule, About, Basket, Options,
    KLNav, KLFooter, LoadingLoansModal, LoanListItem}