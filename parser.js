
const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const HttpAgent = require('agentkeepalive');
const {HttpsAgent} = HttpAgent;
const fs = require('fs');
const parseForEach = require('./parseForEach');
require('dotenv').config()

const initPage = 'https://www.city24.ge/';
const baseURL = 'https://www.city24.ge';

//Control Variables
let pageToParse = process.env.PAGE_TO_PARSE; //without trailing slash and baseurl
let categoryName = process.env.CATEGORY_NAME
const MAX_PAGES_TO_PARSE = process.env.MAX_PAGES_TO_PARSE;

//-----------------------------
let organizationIndex = 1;
let pageIndex = 1;

let categoryContents = [];

const generateStartupLinks = () => {

    return new Promise((resolve, reject) => {
        let categoryList = [];

    got(initPage).then(response => {
        const dom = new JSDOM(response.body);
        let categories = dom.window.document
                              .querySelector('.csd-catalogue-ul')
                              .getElementsByTagName('li');
      
        categories = [...categories];
        //hooking into UL container and crawling through
        categories.forEach((categoryLI) => {


            let categoryLinkDOM = new JSDOM(categoryLI.innerHTML);
            let categoryActualLink = categoryLinkDOM
                                          .window
                                          .document
                                          .querySelector('a')
                                          .href;
      
            let categoryActualTitle = categoryLinkDOM
                                          .window
                                          .document
                                          .querySelector('a')
                                          .querySelector('section')
                                          .textContent
                                          .trim();
      
            //generating list

            categoryList.push({ categoryName: categoryActualTitle,
                                categoryLink: categoryActualLink
                             });

        })

        resolve(categoryList); //pass the parsed category list

      }).catch(err => {
        console.log(err);
        reject(err);
      });
    }); 
    
}

const parseSeperateCategory = (categoryLink, whichPage) => {

    let contentBatch = [];
    let currentPage = whichPage; //on which page are we\
    let currentPageSlug = `/page-${currentPage}`;

    const whenToStopResponseStatusCode = 307; //if page responds with redirect then quit

    return new Promise((resolve, reject) => {
         //initial category page
        got(`${baseURL}${categoryLink}${currentPageSlug}`, {
            agent: {
                http: new HttpAgent(),
                https: new HttpsAgent()
            }
        }
        
        ).then( response => {
            console.log(`${baseURL}${categoryLink}${currentPageSlug}`);
            //check if it's not redirecting
            

            const categoryPageDOM = new JSDOM(response.body);

            let organizations = '';

            try {
                organizations = categoryPageDOM
                                            .window
                                            .document
                                            .querySelector('.csd-organizations-ul')
                                            .getElementsByTagName('li');
            } catch {
                reject(0);
                return;
            }
            

            organizations = [...organizations];
            
            organizations.forEach((organization, index) => {
                
                let organizationLI = new JSDOM(organization.innerHTML);
                //shaping out the image
                
                                                

                let organizationActualURL = organizationLI
                                                .window
                                                .document
                                                .querySelector('a')
                                                .href;

                //we got our first batch, pushing it to the list
                
                contentBatch.push(
                    {
                        index: organizationIndex,
                        organizationURL: organizationActualURL
                    }
                );

                organizationIndex++;

                //console.log(organizationActualURL);
            });
            
            //pass the particular parsed page organizations

            resolve(contentBatch);
        })
        .catch(err => {
            console.log(err);
        });
    });
   
}

const paginateThroughAll = (page) => {
    //run loop to parse all the pages
    let promises = [];

        for(pageIndex; pageIndex <= MAX_PAGES_TO_PARSE; pageIndex++){
            
            promises.push(new Promise((resolve, reject) => {
                parseSeperateCategory(page, pageIndex)
                    .then(res => {
                        res.map(object => {
                            categoryContents.push(object);
                            //final array that we're gonna print out
                        });
                        resolve(`page ${pageIndex} is parsed`);
                    })
                    .catch(err => {
                        //console.log(err);
                        reject(`page ${pageIndex} is not parsed`);
                        return;
                    });
            }))
            
         }
         return promises;  
}



generateStartupLinks()
            .then(res => {
                console.log(res);

                console.log('---------------------------------------------');
                console.log('Please wait we are climbing through'); 


                //Make some interval to bypass

                let currentCat = { name: res[0].categoryName, link: res[0].categoryLink };

                //loop through all parent categories

                Promise.allSettled(paginateThroughAll(pageToParse))
                                .then((res) => {
                                    console.log(categoryContents);
                                    fs.mkdir(`./categories/${categoryName}`, (err) => {
                                        if(err) console.log(err);

                                        console.log(`./categories/${categoryName} dir is made`);

                                        fs.writeFile(`./categories/${categoryName}/${categoryName}.json`, JSON.stringify(categoryContents), (err) => {
                                            if(err) console.log(err);
                                            console.log(`${categoryName}.json is created`);

                                            parseForEach.init(`./categories/${categoryName}/${categoryName}.json`);
                                        });
                                        
                                    });
                                    
                                })
                                .catch(err => {
                                    console.log(err);
                                });               
                
                //console.log(categoryContents);
                 });







