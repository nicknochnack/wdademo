import PropTypes from 'prop-types';
import FilterContainer from '../FilterBase/FilterContainer';

class DocCategoriesFilter extends FilterContainer {
	constructor(...props){
		super(...props);

		this.state = {
			docCategories: this.props.docCategories,
			selectedDocCategories: this.props.selectedDocCategories
		  };
	  
	}

	getSelectedCollection(){
		const { selectedDocCategories } = this.state;
		return selectedDocCategories;	
	}

	getCollection(){
		const { docCategories } = this.state;
		return docCategories;	
	}

	getContainerTitle(){
		return 'Top Doc Categories'
	}

	componentWillReceiveProps(nextProps) {
		this.setState({ docCategories: nextProps.docCategories });
		this.setState({ selectedDocCategories: nextProps.selectedDocCategories });
	  }
	
}

DocCategoriesFilter.propTypes = {
	docCategories: PropTypes.array,
	selectedDocCategories: PropTypes.object,
  };
  
module.exports = DocCategoriesFilter;