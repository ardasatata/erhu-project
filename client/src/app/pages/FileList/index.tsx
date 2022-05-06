// @ts-nocheck
/**
 *
 * RecordVideo
 *
 */
import * as React from 'react';
import styled from 'styled-components/macro';
import { StyleConstants } from '../../../styles/StyleConstants';
import { PageWrapper } from '../../components/PageWrapper';
import { Helmet } from 'react-helmet-async';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from '../../components/Link';
import { NavBar } from '../../components/NavBar';
import { CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import DataTable from 'react-data-table-component';

import { confirmAlert } from 'react-confirm-alert'; // Import
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css

interface Props {}

export function FileList(props: Props) {
  const [isLoading, setIsloading] = useState(false);

  const [datalist, setDatalist] = useState([]);

  const getFileList = async () => {
    setIsloading(true);

    const data = await axios.get('https://140.115.51.243/api/file-list');

    console.log(data.data.filepath);
    setDatalist(data.data.filepath);

    setIsloading(false);
  };

  const reset = async () => {
    window.location.reload();
  };

  useEffect(() => {
    getFileList();
    setInterval(() => {
      getFileList();
    }, 60000);
  }, []);

  const requestDelete = async filename => {
    setIsloading(true);

    const data = await axios
      .get(`https://140.115.51.243/api/delete?filename=${filename}`)
      .then(() => reset());

    console.log(data);

    if (data.ok) {
      alert.success('File Deleted Successfully!');
    } else {
      alert.error('Error deleting!, Please try again..');
    }
  };

  const deleteFile = filename => {
    confirmAlert({
      title: 'Warning!',
      message: `Are you sure to delete ${filename} ?`,
      buttons: [
        {
          label: 'Yes',
          onClick: () => requestDelete(filename),
          className: 'bg-red-500',
        },
        {
          label: 'No',
          onClick: () => null,
        },
      ],
    });
  };

  return (
    <>
      <Helmet>
        <title>List</title>
        <meta
          name="description"
          content="A React Boilerplate application homepage"
        />
      </Helmet>
      <NavBar />
      <PageWrapperMain className={'w-full'}>
        {isLoading ? (
          <div
            className={
              'flex flex-col text-white text-7xl m-auto items-center justify-center'
            }
          >
            <LoadingOutlined className={'mb-12'} />
          </div>
        ) : (
          <div className={'flex h-full w-full bg-black justify-center'}>
            <div className="flex flex-col max-h-screen mt-8 w-full">
              <div className="text-center text-5xl font-bold font-sans text-white">
                File List
              </div>
              <div className="text-center text-md font-light font-sans text-red-500 mb-4">
                *Some files might take some time to predict, Please refresh the
                page after a few minutes!
              </div>
              <div className="flex flex-col bg-white w-full overflow-y-auto">
                <div className={'h-full mb-8 w-full px-8'}>
                  <DataTable
                    pagination={true}
                    paginationPerPage={10}
                    columns={[
                      {
                        name: 'File Name',
                        selector: row => row.filename,
                        style: {
                          fontWeight: 'bold',
                        },
                        sortable: true,
                        minWidth: '120px',
                        // maxWidth: '360px',
                      },
                      {
                        width: '160px',
                        name: 'Analysis Completed',
                        selector: row =>
                          row.isProcessing ? (
                            <LoadingOutlined />
                          ) : (
                            <CheckOutlined />
                          ),
                      },
                      {
                        width: '560px',
                        name: 'Actions',
                        selector: row => (
                          <div className="flex flex-row text-sm font-light items-center">
                            <a
                              className={
                                'flex h-full items-center justify-center mr-2 font-black cursor-pointer hover:text-blue-500'
                              }
                              href={`https://140.115.51.243/api/download-original?filename=${row.processed}`}
                            >
                              {'🗄️ \u00A0 Download Original'}
                            </a>
                            {row.isProcessing ? (
                              <></>
                            ) : (
                              <a
                                className={
                                  'flex h-full items-center justify-center mr-2 font-black cursor-pointer hover:text-blue-500'
                                }
                                href={`https://140.115.51.243/api/download-predict?filename=${row.filename}.mp4`}
                              >
                                {'✨ \u00A0 Download Analyzed'}
                              </a>
                            )}
                            {row.isProcessing ? (
                              <></>
                            ) : (
                              <Link
                                to={
                                  process.env.PUBLIC_URL +
                                  `/playback?title=${row.filename}`
                                }
                                className={'text-blue-500'}
                              >
                                <div
                                  className={
                                    'flex h-full items-center justify-center mr-4 font-black cursor-pointer'
                                  }
                                >
                                  {'▶ \u00A0️ Play'}
                                </div>
                              </Link>
                            )}
                            <a
                              className={
                                'flex h-full items-center justify-center mr-2 font-black cursor-pointer text-red-500 hover:text-blue-500'
                              }
                              onClick={() => deleteFile(row.original)}
                            >
                              {'🚫 \u00A0 Delete'}
                            </a>
                          </div>
                        ),
                      },
                    ]}
                    data={datalist}
                    customStyles={customStyles}
                    dense={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </PageWrapperMain>
    </>
  );
}

const Wrapper = styled.header`
  box-shadow: 0 1px 0 0 ${p => p.theme.borderLight};
  height: ${StyleConstants.NAV_BAR_HEIGHT};
  display: flex;
  position: fixed;
  top: 0;
  width: 100%;
  background-color: ${p => p.theme.background};
  z-index: 2;

  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: blur(10px);
    background-color: ${p =>
      p.theme.background.replace(
        /rgba?(\(\s*\d+\s*,\s*\d+\s*,\s*\d+)(?:\s*,.+?)?\)/,
        'rgba$1,0.75)',
      )};
  }

  ${PageWrapper} {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;

export const PageWrapperMain = styled.div`
  display: flex;
  margin: 0 auto;
  box-sizing: content-box;
  height: calc(100vh - ${StyleConstants.NAV_BAR_HEIGHT});
`;

const columns = [
  {
    name: 'File Name',
    selector: row => row.filename,
    style: {
      fontWeight: 'bold',
    },
    sortable: true,
    // maxWidth: '360px',
  },
  {
    name: 'Status',
    selector: row =>
      row.isProcessing ? <LoadingOutlined className={''} /> : <CheckOutlined />,
    maxWidth: '24px',
  },
  {
    name: 'Actions',
    right: true,
    selector: row => (
      <div className="flex flex-row text-sm font-light items-center">
        <a
          className={
            'flex h-full items-center justify-center mr-2 font-black cursor-pointer hover:text-blue-500'
          }
          href={`https://140.115.51.243/api/download-original?filename=${row.processed}`}
        >
          {'🗄️ \u00A0 Download Original'}
        </a>
        {row.isProcessing ? (
          <></>
        ) : (
          <a
            className={
              'flex h-full items-center justify-center mr-2 font-black cursor-pointer hover:text-blue-500'
            }
            href={`https://140.115.51.243/api/download-predict?filename=${row.filename}.mp4`}
          >
            {'✨ \u00A0 Download Analyzed'}
          </a>
        )}
        {row.isProcessing ? (
          <></>
        ) : (
          <Link
            to={process.env.PUBLIC_URL + `/playback?title=${row.filename}`}
            className={'text-blue-500'}
          >
            <div
              className={
                'flex h-full items-center justify-center mr-4 font-black cursor-pointer'
              }
            >
              {'▶ \u00A0️ Play'}
            </div>
          </Link>
        )}
        <a
          className={
            'flex h-full items-center justify-center mr-2 font-black cursor-pointer text-red-500 hover:text-blue-500'
          }
          onClick={() => null}
        >
          {'🚫 \u00A0 Delete'}
        </a>
      </div>
    ),
  },
];

const customStyles = {
  rows: {
    style: {
      height: '24px', // override the row height
    },
  },
  headCells: {
    style: {
      paddingLeft: '8px', // override the cell padding for head cells
      paddingRight: '8px',
      fontWeight: 'bold',
    },
  },
};
