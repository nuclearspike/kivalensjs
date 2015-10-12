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
import Criteria from './Criteria.jsx'

//COMPONENTS
import KLNav from './KLNav.jsx';
import KLFooter from './KLFooter.jsx';
import LoanListItem from './LoanListItem.jsx';
import BasketListItem from './BasketListItem.jsx'
import LoadingLoansModal from './LoadingLoansModal.jsx'
import KivaImage from './KivaImage.jsx'
import ChartDistribution from './ChartDistribution.jsx'
import CriteriaTabs from './CriteriaTabs.jsx'

//when mistakenly importing without {}'s around variable name. prevents obscure errors.
import CatchNoCurlies from './CatchNoCurlies.jsx';

export default CatchNoCurlies;

export {Search, Details, Loan, NotFound, Schedule, About, Basket, Options,
    KLNav, KLFooter, LoadingLoansModal, LoanListItem, BasketListItem, Criteria, KivaImage,
    ChartDistribution, CriteriaTabs}