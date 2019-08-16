const fs = require("graceful-fs");
const rra = require("recursive-readdir-async");
var path = require("path");
var pdfUtil = require("pdf-to-text");
var PDFParser = require("pdf2json");
var mammoth = require("mammoth");
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
    if (
      path.extname(file.fullname) == ".pdf"
      //|| path.extname(file.fullname) == ".docx"
    ) {
      fileList.push(file.fullname);
    }
  });
  return fileList;
};

const get_Doc_List = async pathList => {
  var fileList = [];
  var count = 0;
  pathList.forEach(function(file) {
    count++;
    if (
      path.extname(file.fullname) == ".docx"
      //|| path.extname(file.fullname) == ".docx"
    ) {
      fileList.push(file.fullname);
    }
  });
  return fileList;
};

const parse_Files = async originalPath => {
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
  var docList = await get_Doc_List(pathList);

  console.log("pdfList length: " + pdfList.length);
  console.log("docList length: " + docList.length);

  return [pdfList, docList];

  //if directory read in everything into array

  //delete everything without the pdf extension.
};

// const get_PDF_Text = async pdfPath => {};
//Discovery add document
const add_doc_Discovery = async addDocumentParams => {
  const res_object = await discovery.addDocument(addDocumentParams); //calls STT to create initial STT response (res_object)

  return res_object;
};

const submit_String = async (data, filePath) => {
  var splitList = [];
  data = data.replace(/\s\s+/g, " ");
  console.log("Length: " + data.length);
  for (var i = 0, charsLength = data.length; i < charsLength; i += 50000) {
    splitList.push(data.substring(i, i + 50000));
    console.log("List Length: " + splitList.length);
  }
  var WDSQuery =
    "<title>" + path.basename(filePath) + "</title>" + "<p>" + data + "</p>";
  var add_document_params = {
    environment_id: "27bd261d-c7ae-4312-9ae9-f9e821fb4675",
    collection_id: "05d75643-6a7a-43d8-84e3-cc89f8f23b10",
    file: WDSQuery
  };
  var discovery_ret = add_doc_Discovery(add_document_params);
  return discovery_ret;
};

let pdfParser = new PDFParser();
pdfParser.on("pdfParser_dataError", errData =>
  console.error(errData.parserError)
);
pdfParser.on("pdfParser_dataReady", pdfData => {
  //  console.log(pdfData.formImage.Pages[0]);
  //  console.log(pdfData.formImage.Pages[0].Texts[0].R);
});

const breakdown_DOCs = async docList => {
  await Promise.all(
    docList.map(async docPath => {
      mammoth
        .extractRawText({ path: docPath })
        .then(function(result) {
          // var text = result.value; // The raw text
          submit_String(result.value, docPath);
        })
        .done();
    })
  );
  console.log("Done");
};

const breakdown_PDFs = async pdfList => {
  await Promise.all(
    pdfList.map(async pdfPath => {
      pdfUtil.pdfToText(pdfPath, function(err, data) {
        if (err) throw err;

        submit_String(data, pdfPath);

        // data = data.replace(/\s\s+/g, " ");
        // for (
        //   var i = 0, charsLength = data.length;
        //   i < charsLength;
        //   i += 50000
        // ) {
        //   splitList.push(data.substring(i, i + 50000));
        //   //  console.log(splitList);
        // }
        // var WDSQuery =
        //   "<title>" +
        //   path.basename(pdfPath) +
        //   "</title>" +
        //   "<p>" +
        //   data +
        //   "</p>";
        // var add_document_params = {
        //   environment_id: "27bd261d-c7ae-4312-9ae9-f9e821fb4675",
        //   collection_id: "05d75643-6a7a-43d8-84e3-cc89f8f23b10",
        //   file: WDSQuery
        // };
        // var discovery_ret = add_doc_Discovery(add_document_params);
      });
    })
  );
};

const main = async originalPath => {
  var fileArray = await parse_Files(process.argv[2]);
  console.log(fileArray);
  var pdfList = fileArray[0];
  var docList = fileArray[1];

  if (pdfList.length == 0) {
    console.log("\nNo PDF files found at path\n");
  } else {
    console.log("\n" + pdfList.length + " PDF(s) found, parsing...\n");
    breakdown_PDFs(pdfList);
    // console.log("parsedList: " + parsedList);
  }

  if (docList.length == 0) {
    console.log("\nERROR: No .docx files found at path\n");
  } else {
    console.log("\n" + docList.length + " .docx files found, parsing...\n");
    breakdown_DOCs(docList);
  }
};

main();

//read in path to every PDF in a folder

//list out PDFs and ask for confirmation

//for each filePath break into array of 50k character pieces

//submit and log that you are waiting for the document to complete
//sae the list of
//write the result to a doc
