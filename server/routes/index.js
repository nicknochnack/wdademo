const routes = require('express').Router();
require('dotenv').config({
	silent: true
  });
  
require('isomorphic-fetch');
const queryTrendBuilder = require('../query-builder-trending');
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const utils = require('../../lib/utils');
const IamTokenManagerV1 = require('watson-developer-cloud/iam-token-manager/v1');

const discovery = new DiscoveryV1({
	url: process.env.DISCOVERY_URL,
	iam_apikey: process.env.DISCOVERY_IAM_APIKEY,
	version: '2018-03-05'
});

/*const tokenManager = new IamTokenManagerV1.IamTokenManagerV1({
    iamApikey: process.env.STT_IAM_APIKEY || '<iam_apikey>',
    iamUrl: process.env.STT_IAM_URL || 'https://iam.cloud.ibm.com/identity/token',
  });
const serviceUrl = process.env.STT_SERVICE_URL*/

const tokenManager = new IamTokenManagerV1({
	iamApikey: process.env.DISCOVERY_IAM_APIKEY || '<iam_apikey>',
	iamUrl: process.env.DISCOVERY_IAM_URL || 'https://iam.cloud.ibm.com/identity/token',
});
const serviceUrl = process.env.DISCOVERY_URL



// initial start-up request
routes.get('/', function(req, res) {
	console.log('In /*');
	res.render('Home/index');
});

routes.get('/api/trending', (req, res) => {
    const { query, filters, count } = req.query;
    console.log('In /api/trending: query = ' + query);
    
    // build params for the trending search request
    const params = {
		environment_id: process.env.DISCOVERY_ENVIRONMENT_ID,
		collection_id: process.env.DISCOVERY_COLLECTION_ID,
		query: query,
		filters: filters ? filters : undefined,
		count: count ? count : undefined
	};

    var searchParams = queryTrendBuilder.search(params);
    discovery.query(searchParams,(err,response)=>{
		if(err){
			res.status(429).json(error);
		}else{
			res.json(response)
		}
	})
});

  // handles search request from search bar
routes.get('/api/search', (req, res) => {
	//console.log('In /api/search: query = ' + req.query);
	let { query, filters, count, returnPassages, sort, queryType, offset} = req.query;
	let params = {
		environment_id: process.env.DISCOVERY_ENVIRONMENT_ID,
		collection_id: process.env.DISCOVERY_COLLECTION_ID,
		natural_language_query: queryType === 'natural_language_query' ? query : undefined,
		query: queryType !== 'natural_language_query' ? query : undefined,
		filter: filters ? filters : undefined,
		count: count ? count : undefined,
		passages_count: count ? count : undefined,
		passages: returnPassages,
		return_fields:'id,result_metadata,enriched_text,extracted_metadata,metadata,highlight,author,version,document_title,title',
		highlight: true,
		offset: offset ? parseInt(offset) : 0
	};

	// console.log(params);

	// add any filters and a limit to the number of matches that can be found
	// if (! sort) {
	//   params.sort = undefined;
	// } else {
	//   params.sort = sort;
	// }

	discovery.query(params, (err,response)=>{
		if(err){
			console.log(err);
			res.status(429).json(err);
		}else{
			res.json(response)
			console.log(response.matching_results);
		}
	})
});

routes.get('/api/aggregation',(req,res)=>{
	//console.log('In /api/aggregation: query = ' + JSON.stringify(req.query));
	let { query, filters, count, queryType} = req.query;
	let aggregation = [];
	//console.log('filters : '+ filters);
	if (filters){
		if(!filters.includes('metadata.documentCategory')){
			aggregation.push('term(metadata.documentCategory,count:15)');
		}
		if(!filters.includes('enriched_text.entities.text')){
			aggregation.push('term(enriched_text.entities.text,count:15)');
		}
		if(!filters.includes('enriched_text.entities.type')){
			aggregation.push('term(enriched_text.entities.type,count:15)');
		}	
	}

	let params = {
		environment_id: process.env.DISCOVERY_ENVIRONMENT_ID,
		collection_id: process.env.DISCOVERY_COLLECTION_ID,
		natural_language_query: queryType === 'natural_language_query' ? query : undefined,
		query: queryType !== 'natural_language_query' ? query : undefined,
		filter: filters ? filters : undefined,
		return_fields:'id',
		count: count ? count : undefined,
		aggregation: aggregation.length > 0 ? `[${aggregation.join()}]` : `[term(metadata.documentCategory,count:15),term(enriched_text.entities.text,count:15),term(enriched_text.entities.type,count:15)]`
	}
	
	discovery.query(params, (err,response)=>{
		if(err){
			console.log(err);
			res.status(429).json(err);
		}else{
			res.json(response);
		}
	})
})

routes.get('/api/credentials', (req,res)=>{
	//console.log('In /api/credentials..');
	tokenManager.getToken((err,token)=>{
		if(err){
			//console.log('In /api/credentials..got error : '+err)
			next(err)
			
		}else{
			let credentials = {
				accessToken: token,
				serviceUrl
			}
			//console.log('In /api/credentials..no error creds: '+credentials);
			res.json(credentials);
		}
	})
});

// handles search string appened to url
routes.get('/:searchQuery', (req,res)=>{
	//console.log('In /api/:searchQuery: query = ' + req.params.searchQuery);
	let searchQuery = req.params.searchQuery ? req.params.searchQuery.replace(/\+/g,' ') : '';
	let params = {
		environment_id: process.env.DISCOVERY_ENVIRONMENT_ID,
		collection_id: process.env.DISCOVERY_COLLECTION_ID,
		natural_language_query: searchQuery,
		passages: false,
		return_fields:'id,result_metadata,enriched_text,extracted_metadata,metadata,highlight,author,version,document_title,title',
		highlight: true,
		aggregation:
		'[' +
		  'term(metadata.documentCategory).term(enriched_text.sentiment.document.label),' +
		  'term(enriched_text.entities.text).term(enriched_text.sentiment.document.label),' +
		  'term(enriched_text.entities.type).term(enriched_text.sentiment.document.label)'+
		']'
	}	

	discovery.query(params,(err,result)=>{
		if(err){
			throw err;
		}else{
			//console.log('Result from Discovery : '+JSON.stringify(result));
			let matches = utils.formatData(utils.parseData(result),[]);
			res.render('index',{
				data: matches,
				entities: result,
				docCategories: result,
				entityTypes: result,
				searchQuery,
				numMatches: result.matching_results,
				error: null
			})
		}
	})
})

module.exports = routes;
