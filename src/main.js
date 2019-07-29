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

import 'isomorphic-fetch';
import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import Matches from './Matches';
import PaginationMenu from './PaginationMenu';
import SearchField from './SearchField';
import EntitiesFilter from './EntitiesFilter';
import DocCategoriesFilter from './DocCategoriesFilter';
import DateFilter from './DateFilter';
import EntityTypesFilter from './EntityTypesFilter';
import TagCloudRegion from './TagCloudRegion';
import { Grid, Dimmer, Button, Divider, Loader, Accordion, Icon, Header} from 'semantic-ui-react';
import * as utils from '../lib/utils';

/**
 * Main React object that contains all objects on the web page.
 * This object manages all interaction between child objects as
 * well as making search requests to the discovery service.
 */
class Main extends React.Component {
  constructor(...props) {
    super(...props);
    const { 
      // query data
      entities, 
      docCategories,
      entityTypes,
      data,
      numMatches,
      error,
      // query params
      searchQuery,
      queryType,
      returnPassages,
      limitResults,
      sortOrder,
      // for filters
      selectedEntities,
      selectedDocCategories,
      selectedEntityTypes,
      selectedDateFrom,
      selectedDateTo,
      // matches panel
      currentPage,
      // tag cloud
      tagCloudType,
      // trending chart
      trendData,
      trendError,
      trendTerm,
      // sentiment chart
      sentimentTerm
    } = this.props;

    // change in state fires re-render of components
    this.state = {
      // query data
      entities: entities && parseEntities(entities),
      //docCategories: docCategories && parseDocCategories(docCategories),
      entityTypes: entityTypes && parseEntityTypes(entityTypes),
      data: data,   // data should already be formatted
      numMatches: numMatches || 0,
      loading: false,
      error: error,
      // query params
      searchQuery: searchQuery || '',
      queryType: queryType || utils.QUERY_NATURAL_LANGUAGE,
      returnPassages: returnPassages || false,
      limitResults: limitResults || false,
      sortOrder: sortOrder || utils.sortKeys[0].sortBy,
      // used by filters
      selectedEntities: selectedEntities || new Set(),
      selectedDocCategories: selectedDocCategories || new Set(),
      selectedEntityTypes: selectedEntityTypes || new Set(),
      selectedDateFrom: selectedDateFrom || '',
      selectedDateTo: selectedDateTo || '',
      // tag cloud
      tagCloudType: tagCloudType || utils.ENTITY_FILTER,
      // trending chart
      trendData: trendData || null,
      trendError: trendError,
      trendTerm: trendTerm || utils.TRENDING_TERM_ITEM,
      trendLoading: false,
      // sentiment chart
      sentimentTerm: sentimentTerm || utils.SENTIMENT_TERM_ITEM,
      // misc panel
      currentPage: currentPage || 1,  // which page of matches are we showing
      activeFilterIndex: 0,             // which filter index is expanded/active
    };
  }

  /**
   * handleAccordionClick - (callback function)
   * User has selected one of the 
   * filter boxes to expand and show values for.
   */
  handleAccordionClick(e, titleProps) {
    const { index } = titleProps;
    const { activeFilterIndex } = this.state;
    const newIndex = activeFilterIndex === index ? -1 : index;
    this.setState({ activeFilterIndex: newIndex });
  }

  /**
   * filtersChanged - (callback function)
   * User has selected one of the values from within
   * of the filter boxes. This results in making a new qeury to 
   * the disco service.
   */
  filtersChanged() {
    const { searchQuery  } = this.state;
    this.fetchData(searchQuery, false);
  }

  filtersDateChange(vals) {
    const { searchQuery  } = this.state;
    this.state.selectedDateFrom = vals.dateFilterFrom;
    this.state.selectedDateTo = vals.dateFilterTo;
    this.fetchData(searchQuery, false);
  }

  /**
   * handleClearAllFiltersClick - (callback function)
   * User has selected button to clear out all filters.
   * This results in making a new qeury to the disco
   * service with no filters turned on.
   */
  handleClearAllFiltersClick() {
    const { searchQuery  } = this.state;
    this.fetchData(searchQuery, true);
  }

  /**
   * searchParamsChanged - (callback function)
   * User has toggled one of the optional params listed in the
   * search bar. Set state so that searchField checkboxes get
   * set accordingly.
   */
  searchParamsChanged(data) {
    const { queryType, returnPassages, limitResults} = this.state;
    if (data.label === 'queryType') {
      var newQueryType = queryType === utils.QUERY_DISCO_LANGUAGE ?
        utils.QUERY_NATURAL_LANGUAGE : utils.QUERY_DISCO_LANGUAGE;
      this.setState({ queryType: newQueryType });
    } else if (data.label === 'returnPassages') {
      this.setState({ returnPassages: !returnPassages });
    } else if (data.label === 'limitResults') {
      this.setState({ limitResults: !limitResults });
    }
  }

  /**
   * pageChanged - (callback function)
   * User has selected a new page of results to display.
   */
  pageChanged(data) {
    this.setState({ currentPage: data.currentPage },
      ()=>{
        this.fetchData(this.state.searchQuery, false);
      });
  }

  /**
   * searchQueryChanged - (callback function)
   * User has entered a new search string to query on. 
   * This results in making a new qeury to the disco service.
   */
  searchQueryChanged(query) {
    const { searchQuery } = query;
    console.log('searchQuery [FROM SEARCH]: ' + searchQuery);
   
    // true = clear all filters for new search
    this.fetchData(searchQuery, true);
  }

  /**
   * sentimentTermChanged - (callback function)
   * User has selected a new term to use in the sentiment
   * chart. Keep track of this so that main stays in sync.
   */
  sentimentTermChanged(data) {
    const { term } = data;
    this.setState({ sentimentTerm: term });
  }

  /**
   * sortOrderChange - (callback function)
   * User has changed how to sort the matches (defaut
   * is by highest score first). Save the value for
   * all subsequent queries to discovery.
   */
  sortOrderChange(event, selection) {
    const { sortOrder, data } = this.state;
    if (sortOrder != selection.value) {
      var sortBy = require('sort-by');
      var sortedData = data.results.slice();

      // get internal version of the sort key
      var internalSortKey = '';
      for (var i=0; i<utils.sortKeys.length; i++) {
        if (utils.sortKeys[i].sortBy === selection.value) {
          internalSortKey = utils.sortKeys[i].sortByInt;
          break;
        }
      }

      // sort by internal key
      sortedData.sort(sortBy(internalSortKey));
      data.results = sortedData;

      // save off external key in case we do another query to Discovery
      this.setState({
        data: data,
        sortOrder: selection.value
      });
    }
  }

  /**
   * tagItemSelected - (callback function)
   * User has selected an item from the tag cloud object
   * to filter on. This results in making a new qeury to the 
   * disco service.
   */
  tagItemSelected(tag) {
    var { selectedTagValue, cloudType } = tag;
    console.log('tagValue [FROM TAG CLOUD]: ' + selectedTagValue);

    // manually add this item to the list of selected items
    // based on filter type. This is needed so that both the 
    // tag cloud and the filter objects stay in sync (both 
    // reflect what items have been selected).
    const { entities, selectedEntities, 
      entityTypes, selectedEntityTypes,
      searchQuery  } = this.state;

    if (cloudType == utils.ENTITY_FILTER) {
      var fullName = this.buildFullTagName(selectedTagValue, entities.results);
      if (selectedEntities.has(fullName)) {
        selectedEntities.delete(fullName);
      } else {
        selectedEntities.add(fullName);
      }
      this.setState({
        selectedEntities: selectedEntities
      });

    } else if (cloudType === utils.ENTITY_TYPE_FILTER) {
      var fullName = this.buildFullTagName(selectedTagValue, entityTypes.results);
      if (selectedEntityTypes.has(fullName)) {
        selectedEntityTypes.delete(fullName);
      } else {
        selectedEntityTypes.add(fullName);
      }
      this.setState({
        selectedEntityTypes: selectedEntityTypes
      });
    }
    // execute new search w/ filters
    this.fetchData(searchQuery, false);
  }

  /**
   * getTrendData - (callback function)
   * User has entered a new search string to query on. 
   * This results in making a new qeury to the disco service.
   * Keep track of the current term value so that main stays
   * in sync with the trending chart component.
   * 
   * NOTE: This function is also called at startup to 
   * display a default graph.
   */
  getTrendData(data) {
    var { limitResults } = this.state;
    var { chartType, term } = data;

    // we don't have any data to show for "all" items, so just clear chart
    if (term === utils.TRENDING_TERM_ITEM) {
      this.setState(
        { 
          trendData: null,
          trendLoading: false,
          trendError: null,
          trendTerm: term
        });
      return;
    } 
    
    this.setState({
      trendLoading: true,
      trendTerm: term
    });

    // build query string, with based on filter type
    var trendQuery = '';
    if (chartType === utils.ENTITIY_FILTER) {
      trendQuery = 'enriched_text.entities.text::' + term;
    } else if (chartType === utils.ENTITY_TYPE_FILTER) {
      trendQuery = 'enriched_text.entities.type::' + term;
    }

    const qs = queryString.stringify({
      query: trendQuery,
      filters: this.buildFilterStringForQuery(),
      count: (limitResults == true ? 100 : 1000)
    });

    // send request
    fetch(`/api/trending?${qs}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw response;
        }
      })
      .then(json => {
        // const util = require('util');
        console.log('+++ DISCO TREND RESULTS +++');
        // console.log(util.inspect(json.aggregations[0].results, false, null));
        console.log('numMatches: ' + json.matching_results);
      
        this.setState({ 
          trendData: json,
          trendLoading: false,
          trendError: null,
          trendTerm: term
        });
      })
      .catch(response => {
        this.setState({
          trendError: (response.status === 429) ? 'Too many requests.' : 'Error fetching results:' + response.status,
          trendLoading: false,
          trendData: null,
          trendTerm: utils.TRENDING_TERM_ITEM
        });
        // eslint-disable-next-line no-console
        console.error(response);
      });
  }
  
  /**
   * fetchData - build the query that will be passed to the 
   * discovery service.
   */
  fetchData(query, clearFilters) {
    const searchQuery = query;
    var { 
      selectedEntities, 
      //selectedDocCategories, 
      selectedEntityTypes,
      selectedDateFrom,
      selectedDateTo,
      queryType,
      returnPassages,
      limitResults,
      sortOrder,
      currentPage
    } = this.state;

    // clear filters if this a new text search
    if (clearFilters) {
      selectedEntities.clear();
      //selectedDocCategories.clear();
      selectedEntityTypes.clear();
      this.state.selectedDateFrom = '',
      this.state.selectedDateTo = ''
    }

    // console.log("FETCH STATE:", this.state);
    console.log("CURRENTPAGE:",currentPage);    
    this.setState({
      loading: true,
      currentPage: currentPage,
      searchQuery
    });

    scrollToMain();
    history.pushState({}, {}, `/${searchQuery.replace(/ /g, '+')}`);
    const filterString = this.buildFilterStringForQuery();
    console.log("CURRENTPAGE:",currentPage);
    // build query string, with filters and optional params
    const qs = queryString.stringify({
      query: searchQuery,
      filters: filterString,
      sort: sortOrder,
      returnPassages: returnPassages,
      queryType: (queryType === utils.QUERY_NATURAL_LANGUAGE ? 'natural_language_query' : 'query'),
      offset: currentPage >= 1 ? (parseInt(currentPage) - 1) * utils.ITEMS_PER_PAGE : 0
    });

    // send request

    fetch(`/api/aggregation?${qs}`).then((response)=>{
      if (response.ok) {
        return response.json();
      } else {
        throw response;
      }
    }).then((json)=>{
      var entities, docCategories, entityTypes;
      if(json.aggregations){
        json.aggregations.forEach((aggregation)=>{     
          if(aggregation.field === "enriched_text.entities.text"){
        	    //console.log("inside aggregation field entities text");
            entities = parseAggregate(json,aggregation)
          }   
          if(aggregation.field === "metadata.documentCategory"){
            //console.log("inside aggregation field Document Category");
            docCategories = parseAggregate(json,aggregation) 
          }
          if(aggregation.field === "enriched_text.entities.type"){
        	  	//console.log("inside aggregation field Entities Type");
            entityTypes = parseAggregate(json,aggregation)
          }
        })  
      }

      this.setState({
        entities: entities ? entities : this.state.entities,
        docCategories: docCategories ? docCategories : this.state.docCategories,
        entityTypes: entityTypes ? entityTypes : this.state.entityTypes
      })
    })



    fetch(`/api/search?${qs}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw response;
        }
      })
      .then(json => {
        var data = utils.parseData(json);
        var passages = [];

        if (returnPassages) {
          passages = parsePassages(json);
        }

        data = utils.formatData(data, passages, filterString);
        
        console.log('+++ DISCO RESULTS +++');
        // const util = require('util');
        // console.log(util.inspect(data.results, false, null));
        console.log('numMatches: ' + data.matching_results);
      
        this.setState({ 
          data: data,
          loading: false,
          numMatches: data.matching_results,
          error: null,
          trendData: null,
          sentimentTerm: utils.SENTIMENT_TERM_ITEM,
          trendTerm: utils.TRENDING_TERM_ITEM
        });
        scrollToMain();
      })
      .catch(response => {
        this.setState({
          error: response.status === 429 ? 'Too many requests' : 'Error fetching results:' + response.status,
          loading: false,
          data: null
        });
        // eslint-disable-next-line no-console
        console.log(response);
      });
  }
  
  /**
   * buildFilterStringForFacet - build the filter string for
   * one set of filter objects.
   */
  buildFilterStringForFacet(collection) {
    var str = [];
    if (collection.size > 0) {
      collection.forEach(function(value) {
        // remove the '(count)' from each entry, if it exists.
        // note - tag cloud items don't have '(count)'s.
        var idx = value.lastIndexOf(' (');
        if (idx >= 0) {
          value = value.substr(0, idx);
        }
        str.push(`"${value}"`)
      });
    }
    return str.length > 0 ?  `[${str.join("|")}]` : '';
  }

  /**
   * buildFilterStringForQuery - convert all selected filters into a string
   * to be added to the search query sent to the discovery service
   */
  buildFilterStringForQuery() {
    var { 
      selectedEntities, 
      selectedDocCategories,
      selectedEntityTypes,
      selectedDateFrom,
      selectedDateTo
    } = this.state;
    var filterString = [];
    
    // add any entities filters, if selected
    var entitiesString = this.buildFilterStringForFacet(selectedEntities);
      if(entitiesString !== ''){
        filterString.push(`enriched_text.entities.text::${entitiesString}`)
      }
      
    // add any doc category filters, if selected
    var docCategoryString = this.buildFilterStringForFacet(selectedDocCategories);
      if(docCategoryString !== ''){
        filterString.push(`metadata.documentCategory::${docCategoryString}`);
      }

    // add any entities type filters, if selected
    var entityTypesString = this.buildFilterStringForFacet(selectedEntityTypes);
      if(entityTypesString !== ''){
        filterString.push(`enriched_text.entities.type::${entityTypesString}`);
      }

    if(selectedDateFrom || selectedDateTo){
      var dateRangeString = [];    
      if(selectedDateFrom === selectedDateTo){
        dateRangeString.push(`metadata.CreateDate=${new Date(selectedDateFrom).getTime()/1000}`)      
      }else{
        if(selectedDateFrom !== '' && selectedDateFrom !== undefined){
          dateRangeString.push(`metadata.CreateDate>=${new Date(selectedDateFrom).getTime()/1000}`);
        }
        if(selectedDateTo !== '' && selectedDateTo !== undefined){
          dateRangeString.push(`metadata.CreateDate<=${new Date(selectedDateTo).getTime()/1000}`);
        }  
      }        
      filterString.push(dateRangeString.join());
    }
    
    return filterString.join();
  }

  /**
   * buildFullTagName - this matches the selected tag cloud item with
   * the item in the filter collection. This is needed to keep them in 
   * sync with each other. This takes care of the issue where the tag
   * cloud item is formatted differently than the collection item (the
   * collection item name has a count appended to it).
   */
  buildFullTagName(tag, collection) {
    // find the tag in collection
    for (var i=0; i<collection.length; i++) {
      console.log('compare tag: ' + tag + ' with: ' + collection[i].key);
      if (collection[i].key === tag) {
        // return the full tag so we can match the entries
        // listed in the filters (which also show num of matches)
        return collection[i].key + ' (' + collection[i].matching_results + ')';
      }
    }
    return tag;
  }

  /**
   * getMatches - return collection matches to be rendered.
   */
  getMatches() {
    const { data, currentPage } = this.state;

    if (!data) {
      return null;
    }

    // get one page of matches
    var page = currentPage;
    var startIdx = (page - 1) * utils.ITEMS_PER_PAGE;
    var pageOfMatches = data.results;

    return (
      <Matches 
        matches={ pageOfMatches }
      />
    );
  }

  /**
   * getPaginationMenu - return pagination menu to be rendered.
   */
  getPaginationMenu() {
    const { numMatches } = this.state;
    
    if (numMatches > 1) {
      return (
        <div className='matches-pagination-bar'>
          <PaginationMenu
            numMatches={numMatches}
            onPageChange={this.pageChanged.bind(this)}
          />
        </div>
      );
    } else {
      return null;
    }
  }

  /**
   * getEntitiesFilter - return entities filter object to be rendered.
   */
  getEntitiesFilter() {
    const { entities, selectedEntities } = this.state;
    if (!entities) {
      return null;
    }
    return (
      <EntitiesFilter 
        onFilterItemsChange={this.filtersChanged.bind(this)}
        entities={entities.results}
        selectedEntities={selectedEntities}
        key={entities.results}
      />
    );
  }
  
  getDocCategoriesFilter() {
    const {docCategories, selectedDocCategories} = this.state;
    if(!docCategories){
      return null;
    }
    return( 
    <DocCategoriesFilter 
      onFilterItemsChange={this.filtersChanged.bind(this)}
      docCategories={docCategories.results}
      selectedDocCategories={selectedDocCategories}
      key={docCategories.results}
    />
    );
  }

  /**
   * getEntityTypeFilter - return entity types filter object to be rendered.
   */
  getEntityTypesFilter() {
    const { entityTypes, selectedEntityTypes } = this.state;
    if (!entityTypes) {
      return null;
    }
    return (
      <EntityTypesFilter
        onFilterItemsChange={this.filtersChanged.bind(this)}
        entityTypes={entityTypes.results}
        selectedEntityTypes={selectedEntityTypes}
        key={entityTypes.results}
      />
    );
  }

  getDateFilter() {
    const { selectedDateFrom, selectedDateTo } = this.state;
    if(selectedDateFrom == undefined || selectedDateTo == undefined) {
      return null;
    }
    return (<DateFilter 
      onFilterItemsChange={this.filtersDateChange.bind(this)}
      selectedDateFrom={selectedDateFrom}
      selectedDateTo={selectedDateTo}/>
    )
  }

  
  /**
   * render - return all the home page object to be rendered.
   */
  render() {
    const { loading, data, error, searchQuery,
      entities, docCategories, currentPage, entityTypes,
      selectedEntities, selectedDocCategories, 
      selectedEntityTypes, selectedDateFrom, selectedDateTo,
      numMatches,
      tagCloudType, trendData, trendLoading, trendError, trendTerm,
      queryType, returnPassages, limitResults, sortOrder,
      sentimentTerm } = this.state;

    // used for filter accordions
    const { activeFilterIndex } = this.state;

    const stat_items = 
      { key: 'matches', label: 'Results', value: numMatches }

    var filtersOn = false;
    if (selectedEntities.size > 0 ||
      selectedDocCategories.size > 0 ||
      selectedEntityTypes.size > 0 ||
      selectedDateFrom != '' || selectedDateTo != '') {
      filtersOn = true;
    }
    
    return (
      <Grid celled className='search-grid'>

        {/* Search Field Header */}

        <Grid.Row color={'blue'}>
          <Grid.Column width={16} textAlign='center'>
            <SearchField
              onSearchQueryChange={this.searchQueryChanged.bind(this)}
              onSearchParamsChange={this.searchParamsChanged.bind(this)}
              searchQuery={searchQuery}
              queryType={queryType}
              returnPassages={returnPassages}
              limitResults={limitResults}
            />
          </Grid.Column>
        </Grid.Row>

        {/* Results Panel */}

        <Grid.Row className='matches-grid-row'>

          {/* Drop-Down Filters */}

          <Grid.Column width={3}>
            {filtersOn ? ( <Button compact basic color='red' content='clear all' icon='remove' onClick={this.handleClearAllFiltersClick.bind(this)} /> ) : null}
            <Header as='h2' block inverted textAlign='left'>
              <Icon name='filter' />
              <Header.Content>
                Filter
                <Header.Subheader>
                  By List
                </Header.Subheader>
              </Header.Content>
            </Header>
            <Accordion styled>
              <Accordion.Title 
                active={activeFilterIndex == utils.ENTITY_DATA_INDEX}
                index={utils.ENTITY_DATA_INDEX}
                onClick={this.handleAccordionClick.bind(this)}>
                <Icon name='dropdown' />
                Entities
              </Accordion.Title>
              <Accordion.Content active={activeFilterIndex == utils.ENTITY_DATA_INDEX}>
                {this.getEntitiesFilter()}
              </Accordion.Content>
            </Accordion>
            <Accordion styled>
              <Accordion.Title
                active={activeFilterIndex == utils.ENTITY_TYPE_DATA_INDEX}
                index={utils.ENTITY_TYPE_DATA_INDEX}
                onClick={this.handleAccordionClick.bind(this)}>
                <Icon name='dropdown' />
                Entity Types
              </Accordion.Title>
              <Accordion.Content active={activeFilterIndex == utils.ENTITY_TYPE_DATA_INDEX}>
                {this.getEntityTypesFilter()}
              </Accordion.Content>
            </Accordion>
            <Divider hidden/>
            <Divider/>
            <Divider hidden/>

            {/* Tag Cloud Region */}
    
            <Grid.Row>
              <TagCloudRegion
                entities={entities}
                entityTypes={entityTypes}
                tagCloudType={tagCloudType}
                onTagItemSelected={this.tagItemSelected.bind(this)}
              />
            </Grid.Row>
            
          </Grid.Column>

          {/* Results */}

          <Grid.Column width={13}>
            <Grid.Row>
              {loading ? (
                <div className="results">
                  <div className="loader--container">
                    <Dimmer active inverted>
                      <Loader>Loading</Loader>
                    </Dimmer>
                  </div>
                </div>
              ) : data ? (
                <div className="results">
                  <div className="_container _container_large">
                    <div className="row">
                      <div>
                        <Header as='h2' block inverted textAlign='left'>
                          <Icon name='grid layout' />
                          <Header.Content>
                            Matches
                          </Header.Content>
                        </Header>
                        <div style={{display:'flex', justifyContent:'space-between',alignContent: 'center', alignItems: 'center'}}>
                          <Header size='large' style={{margin:'10px'}}>{stat_items.value} Results</Header>
                          <Header size='large' style={{margin:'10px'}}>Page { currentPage } of {Math.ceil(numMatches / utils.ITEMS_PER_PAGE)}</Header>
                        </div>
                        {/* <Menu compact className="sort-dropdown">
                          <Icon name='sort' size='large' bordered inverted />
                          <Dropdown 
                            item
                            onChange={ this.sortOrderChange.bind(this) }
                            value={ sortOrder }
                            options={ utils.sortTypes }
                          />
                        </Menu> */}
                      </div>
                      <div>
                        {this.getMatches()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="results">
                  <div className="_container _container_large">
                    <div className="row">
                      {JSON.stringify(error)}
                    </div>
                  </div>
                </div>
              ) : null}
            </Grid.Row>
            <Divider clearing hidden/>

            {/* Pagination Menu */}

            <Grid.Row>
              {this.getPaginationMenu()}
            </Grid.Row>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }
}

const parsePassages = data => ({
  rawResponse: Object.assign({}, data),
  results: data.passages
});

const parseAggregate = (data,aggregation) =>{
  let results = [];
  aggregation.results.forEach((result)=>{
    if(result.key !=''){
      results.push(result);
    }
  })
  return{
    rawResponse: Object.assign({},data),
    results: results 
  }
}

const parseEntities = data => ({
  rawResponse: Object.assign({}, data),
  results: data.aggregations[utils.ENTITY_DATA_INDEX].results
});

const parseDocCategories = data => {
  let results = [];
  data.aggregations[utils.DOC_CATEGORY_DATA_INDEX].results.forEach((result)=>{
    if(result.key !=''){
      results.push(result);
    }
  })
  return { rawResponse: Object.assign({}, data), results: results }
}

({
});

const parseEntityTypes = data => ({
  rawResponse: Object.assign({}, data),
  results: data.aggregations[utils.ENTITY_TYPE_DATA_INDEX].results
});

/**
 * scrollToMain - scroll window to show 'main' rendered object.
 */
function scrollToMain() {
  setTimeout(() => {
    const scrollY = document.querySelector('main').getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, scrollY);
  }, 0);
}

// type check to ensure we are called correctly
Main.propTypes = {
  data: PropTypes.object,
  entities: PropTypes.object,
  entityTypes: PropTypes.object,
  searchQuery: PropTypes.string,
  selectedEntities: PropTypes.object,
  selectedEntityTypes: PropTypes.object,
  selectedDateFrom: PropTypes.string,
  selectedDateTo: PropTypes.string,
  numMatches: PropTypes.number,
  tagCloudType: PropTypes.string,
  currentPage: PropTypes.number,
  queryType: PropTypes.string,
  returnPassages: PropTypes.bool,
  limitResults: PropTypes.bool,
  sortOrder: PropTypes.string,
  trendData: PropTypes.object,
  trendError: PropTypes.object,
  trendTerm: PropTypes.string,
  sentimentTerm: PropTypes.string,
  error: PropTypes.object
};

module.exports = Main;
