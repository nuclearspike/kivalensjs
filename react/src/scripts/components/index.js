'use strict';

//PAGES
import Search from './Search.jsx';
import Criteria from './Criteria.jsx'
import Loan from './Loan.jsx';
import Basket from './Basket.jsx';
import Options from './Options.jsx';
import About from './About.jsx';
import NotFound from './NotFound.jsx';

//COMPONENTS
import KLNav from './KLNav.jsx';
import KLFooter from './KLFooter.jsx';
import LoanListItem from './LoanListItem.jsx';
import BasketListItem from './BasketListItem.jsx'
import LoadingLoansModal from './LoadingLoansModal.jsx'
import BulkAddModal from './BulkAddModal.jsx'
import KivaImage from './KivaImage.jsx'
import ChartDistribution from './ChartDistribution.jsx'
import CriteriaTabs from './CriteriaTabs.jsx'

//when mistakenly importing without {}'s around variable name. prevents obscure errors.
import CatchNoCurlies from './CatchNoCurlies.jsx';

export default CatchNoCurlies;

export {Search, Loan, NotFound, About, Basket, Options, Criteria, KivaImage,
    KLNav, KLFooter, LoadingLoansModal, BulkAddModal, LoanListItem, BasketListItem,
    ChartDistribution, CriteriaTabs}