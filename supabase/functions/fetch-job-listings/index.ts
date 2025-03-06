
      if (!provider || provider === 'jobdataapi') servicesToUse.push(jobDataAPIService.search(searchTerm));
      if (!provider || provider === 'usajobs') servicesToUse.push(usaJobsService.search(searchTerm));
      if (!provider || provider === 'remoteok') servicesToUse.push(remoteOKService.search(searchTerm));
      if (!provider || provider === 'glassdoor') servicesToUse.push(glassdoorService.search(searchTerm));
