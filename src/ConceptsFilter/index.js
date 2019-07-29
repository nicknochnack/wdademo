/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import PropTypes from 'prop-types';
import FilterContainer from '../FilterBase/FilterContainer';

/**
 * ConceptsFilter - A container component for Concept objects.
 * This object appears on the web page and allows the user to
 * filter matches based on a 'concept' value. It's core functionality
 * comes from its parents class - the FilterContainer.
 */
class ConceptsFilter extends FilterContainer {
  constructor(...props) {
    super(...props);

    this.state = {
      concepts: this.props.concepts,
      selectedConcepts: this.props.selectedConcepts
    };
  }

  /**
   * getSelectedCollection - Override parent class to return collection 
   * of selected concept items.
   */
  getSelectedCollection() {
    const { selectedConcepts } = this.state;
    return selectedConcepts;
  }

  /**
   * getCollection - Override parent class to return collection 
   * of all concept items.
   */
  getCollection() {
    const { concepts } = this.state;
    return concepts;
  }

  /**
   * getContainerTitle - Override parent class to return title of 
   * the filter container. 
   */
  getContainerTitle() {
    return 'Top Concepts';
  }  

  // Important - this is needed to ensure changes to main properties
  // are propagated down to our component. In this case, some other
  // search or filter event has occured which has changed the list of 
  // concepts, or which concepts are selected.
  componentWillReceiveProps(nextProps) {
    this.setState({ concepts: nextProps.concepts });
    this.setState({ selectedConcepts: nextProps.selectedConcepts });
  }
}

// type check to ensure we are called correctly
ConceptsFilter.propTypes = {
  concepts: PropTypes.array,
  selectedConcepts: PropTypes.object,
};

// export so we are visible to parent
module.exports = ConceptsFilter;
