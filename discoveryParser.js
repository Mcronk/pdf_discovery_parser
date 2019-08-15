const fs = require("graceful-fs");
const rra = require("recursive-readdir-async");
var path = require("path");
var pdfUtil = require("pdf-to-text");
const DiscoveryV1 = require("ibm-watson/discovery/v1");

const discovery = new DiscoveryV1({
  version: "2019-04-30",
  iam_apikey: "qt5H7hz5ahDZcuioxLc8BCl3d1A-owmviZDVFlyaDwdD",
  url: "https://gateway.watsonplatform.net/discovery/api"
});
// process.argv[.forEach(function(val, index, array) {
//   console.log(index + ": " + val);
//   console.log()]
// });

//console.log(process.argv[2]);

const is_Directory = async originalPath => {
  if (fs.lstatSync(originalPath).isDirectory()) {
    //if the path is to a directory

    if (!originalPath.endsWith("/")) {
      originalPath += "/";
      return [true, originalPath];
    } else {
      return [true, originalPath];
    }
  } else {
    return [false, originalPath];
  }
};

const get_PDF_List = async pathList => {
  var fileList = [];
  var count = 0;
  pathList.forEach(function(file) {
    count++;
    if (path.extname(file.fullname) == ".pdf") {
      fileList.push(file.fullname);
    }
  });
  return fileList;
};

const parse_PDFs = async originalPath => {
  var isDirectory = await is_Directory(originalPath);
  var pathList = [];
  if (isDirectory[0] == true) {
    const rraOptions = {
      mode: rra.LIST,
      recursive: false,
      stats: false,
      ignoreFolders: true,
      extensions: false,
      deep: false,
      realPath: true,
      normalizePath: true,
      include: [],
      exclude: [],
      readContent: false,
      encoding: "base64"
    };
    var pathList = await rra.list(originalPath, rraOptions);
  } else {
    pathList.push({ fullname: isDirectory[1] });
  }

  var pdfList = await get_PDF_List(pathList);
  return pdfList;

  //if directory read in everything into array

  //delete everything without the pdf extension.
};

// const get_PDF_Text = async pdfPath => {};
//Discovery add document
const add_doc_Discovery = async addDocumentParams => {
  const res_object = await discovery.addDocument(addDocumentParams); //calls STT to create initial STT response (res_object)

  return res_object;
};

const breakdown_PDFs = async pdfList => {
  var pdfBufferList = {};

  await Promise.all(
    pdfList.map(async pdfPath => {
      pdfUtil.pdfToText(pdfPath, function(err, data) {
        if (err) throw err;
        data = data.replace(/\s\s+/g, " ");

        console.log(data.length);
        var splitList = [];
        for (
          var i = 0, charsLength = data.length;
          i < charsLength;
          i += 50000
        ) {
          splitList.push(data.substring(i, i + 50000));
        }

        console.log(splitList.length);
        splitList.map(async stringChunk => {
          var WDSQuery =
            "<title>" +
            path.basename(pdfPath) +
            "</title>" +
            "<p>" +
            stringChunk +
            "</p>";
          var add_document_params = {
            environment_id: "27bd261d-c7ae-4312-9ae9-f9e821fb4675",
            collection_id: "2d40ea28-1f3d-4027-b259-39ca697c76cf",
            file: WDSQuery
          };
          var discovery_ret = await add_doc_Discovery(add_document_params);
        });

        // pdfBufferList[pdfPath] = splitList;
        // console.log(pdfBufferList);
      });
    })
  );
  console.log(pdfBufferList);
};

const main = async originalPath => {
  var pdfList = await parse_PDFs(process.argv[2]);
  if (pdfList.length == 0) {
    console.log("\nERROR: No PDFs found at path\n");
  } else {
    console.log("\n" + pdfList.length + " PDFs found, parsing...\n");
    var parsedList = await breakdown_PDFs(pdfList);
  }
};

main();

//read in path to every PDF in a folder

//list out PDFs and ask for confirmation

//for each filePath break into array of 50k character pieces

//submit and log that you are waiting for the document to complete
//sae the list of
//write the result to a doc
