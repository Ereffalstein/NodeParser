const fs = require('fs');
const path = require('path');
const got = require('got');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

let organizationLinks = [];
let actualOrganizations = [];

const baseURL = 'https://www.city24.ge';


const init = (fileToRead) => {

    let organizations = [];

    fs.readFile(fileToRead, (err, data) => {
        if (err) {
          console.error(err)
          return
        }
        organizations = JSON.parse(data.toString());

        organizations.forEach(organization => {
            organizationLinks.push(organization.organizationURL);
        });

        const promises = organizationLinks.map( link => {
            return new Promise((resolve, reject) => {
            got(`${baseURL}${link}`).then((res) => { 
                
                const organizationDOM = new JSDOM(res.body);

                const organization = {
                    name: '',
                    address: '',
                    phone: '',
                    workingHours: '',
                    details: '',
                    primaryImage: '',
                    images: [],
                    map: '',
                    childCategory: ''
                };

                //grab name 

                organization.name = organizationDOM
                                        .window
                                        .document
                                        .querySelector('h1')
                                        .textContent;

                //grab address

                organization.address = organizationDOM
                                        .window
                                        .document
                                        .querySelector('.csd-org-li-address')
                                        .textContent
                                        .trim();

                //grab phone

                let organizationPhone = organizationDOM
                                            .window
                                            .document
                                            .querySelector('.csd-org-li-phone');

                if(organizationPhone)
                    organization.phone = organizationPhone.textContent;

                //grab working hours 

                let workingHoursDOM = organizationDOM
                                        .window
                                        .document
                                        .querySelector('.csd-org-li-open-list');

                if(workingHoursDOM) 
                    organization.workingHours = workingHoursDOM.textContent;
                //grab brands 
                
                let DOMdetails = organizationDOM
                                    .window
                                    .document
                                    .querySelector('.csd-org-name-logo-holder')
                                    .querySelector('h2')
                                    .textContent;

                //grab primary image

                let DOMprimaryImage = organizationDOM
                                    .window
                                    .document
                                    .querySelector('.csd-org-logo-holder img');
                if(DOMprimaryImage)
                    organization.primaryImage = DOMprimaryImage.src;
                                    

                //grab gallery
                
                let DOMgallery = organizationDOM
                                    .window
                                    .document
                                    .querySelector('.org-gallery')
                                    .getElementsByTagName('img');
                

                if(DOMgallery.length > 0) {
                    for(let i = 1; i < DOMgallery.length; i++)
                        organization.images.push(DOMgallery[i].src);
                }


                organization.details = organizationDOM
                                        .window
                                        .document
                                        .querySelector('.csd-org-name-logo-holder')
                                        .querySelector('h2')
                                        .textContent || '';
                //grab child category 

                organization.childCategory = organizationDOM
                                                .window
                                                .document
                                                .querySelector('.csd-catalogue-path-ul')
                                                .getElementsByTagName('li')[2]
                                                .textContent


                //console.log(JSON.stringify(organization, null, 2));
                //push to the global array
                actualOrganizations.push(organization);
                console.log(organization);
                resolve('yes');

            })
            .catch((rej) => {
                console.log(rej);
            }) 
            
          });
        });

        Promise.allSettled(promises)
                .then( res => {
                    console.log(actualOrganizations);
                    console.log('Everything parsed successfully...');
                    //write the final file
                    const dir = path.parse(fileToRead).dir; //the file from an init function
                    const fileName = path.parse(fileToRead).name;
                    const dataToWrite = JSON.stringify(actualOrganizations);
                    console.log(`${dir}/${fileName}_final.json`);
                    fs.writeFile(`${dir}/${fileName}_final.json`, dataToWrite, (err) => {
                        if(err) throw err;
                    });
                    
                })
        
      })
}

exports.init = init;
